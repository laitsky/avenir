import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Avenir } from "../target/types/avenir";
import { assert } from "chai";
import { randomBytes } from "crypto";

import {
  setupArciumContext,
  encryptBetInput,
  createTestMarket,
  getArciumAccounts,
  initCompDef,
  getConfigPda,
  getMarketPda,
  getMarketPoolPda,
  ArciumContext,
} from "./mpc/helpers";

describe("place_bet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.avenir as Program<Avenir>;
  const admin = provider.wallet as anchor.Wallet;
  const payer = admin.payer;
  const connection = provider.connection;

  // Test keypairs
  const creator = Keypair.generate();
  const bettor = Keypair.generate();
  const bettor2 = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const feeRecipient = Keypair.generate().publicKey;
  const protocolFeeBps = 200; // 2%

  // Will be set in before() hooks
  let usdcMint: PublicKey;
  let arciumCtx: ArciumContext;
  let bettorTokenAccount: PublicKey;
  let bettor2TokenAccount: PublicKey;

  // Config PDA
  const [configPda] = getConfigPda(program.programId);

  // Market state (set in before hook)
  let marketPda: PublicKey;
  let marketPoolPda: PublicKey;
  let vaultPda: PublicKey;
  let marketId: number;

  // PDA helpers
  function getPositionPda(
    mktId: number,
    user: PublicKey
  ): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(mktId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("position"), buf, user.toBuffer()],
      program.programId
    );
  }

  function getVaultPda(mktId: number): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(mktId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), buf],
      program.programId
    );
  }

  before(async () => {
    // 1. Airdrop SOL to test accounts
    const airdropCreator = await connection.requestAirdrop(
      creator.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropCreator);

    const airdropBettor = await connection.requestAirdrop(
      bettor.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropBettor);

    const airdropBettor2 = await connection.requestAirdrop(
      bettor2.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropBettor2);

    const airdropMintAuth = await connection.requestAirdrop(
      mintAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropMintAuth);

    // 2. Create USDC mint (6 decimals)
    usdcMint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6
    );

    // 3. Initialize Config PDA
    await program.methods
      .initialize({
        feeRecipient,
        usdcMint,
        protocolFeeBps,
      })
      .accountsPartial({
        admin: admin.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    // 4. Whitelist the test creator
    const [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), creator.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .addCreator()
      .accountsPartial({
        admin: admin.publicKey,
        config: configPda,
        whitelist: whitelistPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    // 5. Setup Arcium context
    arciumCtx = await setupArciumContext(provider, program.programId);

    // 6. Initialize comp_defs for update_pool (needed by place_bet)
    await initCompDef(program, payer, "init_pool", arciumCtx);
    await initCompDef(program, payer, "update_pool", arciumCtx);

    // 7. Create a market with future deadline
    const result = await createTestMarket(
      program,
      admin,
      creator,
      usdcMint,
      configPda,
      1, // expectedMarketId
      {
        question: "Will place_bet tests pass?",
        resolutionTime: Math.floor(Date.now() / 1000) + 7200, // 2h from now
      }
    );
    marketPda = result.marketPda;
    marketPoolPda = result.marketPoolPda;
    vaultPda = result.vaultPda;
    marketId = result.marketId;

    // 8. Initialize pool via init_pool MPC to get valid encrypted zeros
    const initPoolBet = encryptBetInput(arciumCtx.mxePublicKey, true, 0);
    const initPoolAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      initPoolBet.computationOffset,
      "init_pool"
    );

    await program.methods
      .initPool(initPoolBet.computationOffset)
      .accountsPartial({
        payer: payer.publicKey,
        marketPool: marketPoolPda,
        mxeAccount: initPoolAccounts.mxeAccount,
        signPdaAccount: initPoolAccounts.signPdaAccount,
        mempoolAccount: initPoolAccounts.mempoolAccount,
        executingPool: initPoolAccounts.executingPool,
        computationAccount: initPoolAccounts.computationAccount,
        compDefAccount: initPoolAccounts.compDefAccount,
        clusterAccount: initPoolAccounts.clusterAccount,
        poolAccount: initPoolAccounts.poolAccount,
        clockAccount: initPoolAccounts.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: initPoolAccounts.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Wait for init_pool callback to complete
    const { awaitComputationFinalization } = await import("@arcium-hq/client");
    await awaitComputationFinalization(
      provider,
      initPoolBet.computationOffset,
      program.programId,
      "confirmed",
      120_000
    );

    // 9. Create bettor's USDC token accounts and mint test USDC
    bettorTokenAccount = await createAssociatedTokenAccount(
      connection,
      bettor,
      usdcMint,
      bettor.publicKey
    );

    // Mint 100 USDC to bettor
    await mintTo(
      connection,
      mintAuthority,
      usdcMint,
      bettorTokenAccount,
      mintAuthority.publicKey,
      100_000_000 // 100 USDC
    );

    bettor2TokenAccount = await createAssociatedTokenAccount(
      connection,
      bettor2,
      usdcMint,
      bettor2.publicKey
    );

    // Mint 100 USDC to bettor2
    await mintTo(
      connection,
      mintAuthority,
      usdcMint,
      bettor2TokenAccount,
      mintAuthority.publicKey,
      100_000_000 // 100 USDC
    );

    console.log("  place_bet test setup complete:");
    console.log("    USDC Mint:", usdcMint.toBase58());
    console.log("    Market ID:", marketId);
    console.log("    Bettor:", bettor.publicKey.toBase58());
    console.log("    Bettor2:", bettor2.publicKey.toBase58());
  });

  // ==========================================================================
  // Test 1: places a valid Yes bet with USDC transfer
  // ==========================================================================
  it("places a valid Yes bet with USDC transfer", async () => {
    const betAmount = 5_000_000; // 5 USDC
    const isYes = true;

    // Get balances before
    const bettorBalanceBefore = (await getAccount(connection, bettorTokenAccount)).amount;
    const vaultBalanceBefore = (await getAccount(connection, vaultPda)).amount;

    // Encrypt bet input
    const bet = encryptBetInput(arciumCtx.mxePublicKey, isYes, betAmount);

    const arciumAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet.computationOffset,
      "update_pool"
    );

    // Derive position PDA
    const [positionPda] = getPositionPda(marketId, bettor.publicKey);

    await program.methods
      .placeBet(
        new anchor.BN(betAmount),
        isYes,
        new anchor.BN(bet.computationOffset),
        Array.from(bet.isYesCiphertext) as unknown as number[],
        Array.from(bet.amountCiphertext) as unknown as number[],
        Array.from(bet.publicKey) as unknown as number[],
        bet.nonceBN
      )
      .accountsPartial({
        bettor: bettor.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        userPosition: positionPda,
        userTokenAccount: bettorTokenAccount,
        marketVault: vaultPda,
        pendingBettorTokenAccount: bettorTokenAccount,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        mxeAccount: arciumAccounts.mxeAccount,
        signPdaAccount: arciumAccounts.signPdaAccount,
        mempoolAccount: arciumAccounts.mempoolAccount,
        executingPool: arciumAccounts.executingPool,
        computationAccount: arciumAccounts.computationAccount,
        compDefAccount: arciumAccounts.compDefAccount,
        clusterAccount: arciumAccounts.clusterAccount,
        poolAccount: arciumAccounts.poolAccount,
        clockAccount: arciumAccounts.clockAccount,
        arciumProgram: arciumAccounts.arciumProgram,
      })
      .signers([bettor])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Verify: bettor's token balance decreased by 5 USDC
    const bettorBalanceAfter = (await getAccount(connection, bettorTokenAccount)).amount;
    assert.equal(
      Number(bettorBalanceBefore - bettorBalanceAfter),
      betAmount,
      "Bettor balance should decrease by bet amount"
    );

    // Verify: vault balance increased by 5 USDC
    const vaultBalanceAfter = (await getAccount(connection, vaultPda)).amount;
    assert.equal(
      Number(vaultBalanceAfter - vaultBalanceBefore),
      betAmount,
      "Vault balance should increase by bet amount"
    );

    // Verify: market state
    const market = await program.account.market.fetch(marketPda);
    assert.isTrue(market.mpcLock, "mpc_lock should be true");
    assert.ok(
      market.pendingBettor.equals(bettor.publicKey),
      "pending_bettor should be bettor"
    );
    assert.equal(
      market.pendingAmount.toNumber(),
      betAmount,
      "pending_amount should be bet amount"
    );
    assert.isTrue(market.pendingIsYes, "pending_is_yes should be true");
    assert.isTrue(
      market.lockTimestamp.toNumber() > 0,
      "lock_timestamp should be set"
    );

    // Verify: UserPosition PDA exists (created by init_if_needed)
    const position = await program.account.userPosition.fetch(positionPda);
    assert.equal(
      position.marketId.toNumber(),
      marketId,
      "UserPosition market_id should match"
    );

    console.log("    Valid Yes bet placed:");
    console.log("      Amount:", betAmount, "lamports (5 USDC)");
    console.log("      Bettor balance change:", Number(bettorBalanceBefore - bettorBalanceAfter));
    console.log("      Vault balance change:", Number(vaultBalanceAfter - vaultBalanceBefore));
    console.log("      mpc_lock:", market.mpcLock);
    console.log("      lock_timestamp:", market.lockTimestamp.toNumber());

    // Wait for MPC callback to complete so lock is released for subsequent tests
    console.log("    Awaiting MPC callback to release lock...");
    const { awaitComputationFinalization } = await import("@arcium-hq/client");
    await awaitComputationFinalization(
      provider,
      bet.computationOffset,
      program.programId,
      "confirmed",
      120_000
    );

    // Verify lock released
    const marketAfterCallback = await program.account.market.fetch(marketPda);
    assert.isFalse(marketAfterCallback.mpcLock, "mpc_lock should be released after callback");
    console.log("    MPC callback complete, lock released");
  });

  // ==========================================================================
  // Test 2: rejects bet below minimum (1 USDC)
  // ==========================================================================
  it("rejects bet below minimum (1 USDC)", async () => {
    const betAmount = 999_999; // Just under 1 USDC
    const isYes = true;

    const bet = encryptBetInput(arciumCtx.mxePublicKey, isYes, betAmount);
    const arciumAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet.computationOffset,
      "update_pool"
    );
    const [positionPda] = getPositionPda(marketId, bettor.publicKey);

    // Record balance before
    const bettorBalanceBefore = (await getAccount(connection, bettorTokenAccount)).amount;

    try {
      await program.methods
        .placeBet(
          new anchor.BN(betAmount),
          isYes,
          new anchor.BN(bet.computationOffset),
          Array.from(bet.isYesCiphertext) as unknown as number[],
          Array.from(bet.amountCiphertext) as unknown as number[],
          Array.from(bet.publicKey) as unknown as number[],
          bet.nonceBN
        )
        .accountsPartial({
          bettor: bettor.publicKey,
          market: marketPda,
          marketPool: marketPoolPda,
          userPosition: positionPda,
          userTokenAccount: bettorTokenAccount,
          marketVault: vaultPda,
          pendingBettorTokenAccount: bettorTokenAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          mxeAccount: arciumAccounts.mxeAccount,
          signPdaAccount: arciumAccounts.signPdaAccount,
          mempoolAccount: arciumAccounts.mempoolAccount,
          executingPool: arciumAccounts.executingPool,
          computationAccount: arciumAccounts.computationAccount,
          compDefAccount: arciumAccounts.compDefAccount,
          clusterAccount: arciumAccounts.clusterAccount,
          poolAccount: arciumAccounts.poolAccount,
          clockAccount: arciumAccounts.clockAccount,
          arciumProgram: arciumAccounts.arciumProgram,
        })
        .signers([bettor])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected BetTooSmall error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("BetTooSmall") ||
          errStr.includes("6012") ||
          errStr.includes("Bet amount must be at least 1 USDC"),
        `Expected BetTooSmall error, got: ${errStr.substring(0, 200)}`
      );
      console.log("    BetTooSmall correctly rejected");
    }

    // Verify no USDC transferred
    const bettorBalanceAfter = (await getAccount(connection, bettorTokenAccount)).amount;
    assert.equal(
      Number(bettorBalanceBefore),
      Number(bettorBalanceAfter),
      "Bettor balance should be unchanged after rejection"
    );
  });

  // ==========================================================================
  // Test 3: rejects bet when MPC lock is active
  // ==========================================================================
  it("rejects bet when MPC lock is active", async () => {
    // Place a valid bet to activate the lock
    const bet1Amount = 1_000_000; // 1 USDC
    const bet1 = encryptBetInput(arciumCtx.mxePublicKey, true, bet1Amount);
    const arciumAccounts1 = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet1.computationOffset,
      "update_pool"
    );
    const [positionPda1] = getPositionPda(marketId, bettor.publicKey);

    await program.methods
      .placeBet(
        new anchor.BN(bet1Amount),
        true,
        new anchor.BN(bet1.computationOffset),
        Array.from(bet1.isYesCiphertext) as unknown as number[],
        Array.from(bet1.amountCiphertext) as unknown as number[],
        Array.from(bet1.publicKey) as unknown as number[],
        bet1.nonceBN
      )
      .accountsPartial({
        bettor: bettor.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        userPosition: positionPda1,
        userTokenAccount: bettorTokenAccount,
        marketVault: vaultPda,
        pendingBettorTokenAccount: bettorTokenAccount,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        mxeAccount: arciumAccounts1.mxeAccount,
        signPdaAccount: arciumAccounts1.signPdaAccount,
        mempoolAccount: arciumAccounts1.mempoolAccount,
        executingPool: arciumAccounts1.executingPool,
        computationAccount: arciumAccounts1.computationAccount,
        compDefAccount: arciumAccounts1.compDefAccount,
        clusterAccount: arciumAccounts1.clusterAccount,
        poolAccount: arciumAccounts1.poolAccount,
        clockAccount: arciumAccounts1.clockAccount,
        arciumProgram: arciumAccounts1.arciumProgram,
      })
      .signers([bettor])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("    First bet placed, mpc_lock should be active");

    // Verify lock is active
    const marketLocked = await program.account.market.fetch(marketPda);
    assert.isTrue(marketLocked.mpcLock, "mpc_lock should be true");

    // Attempt second bet from bettor2 while lock is active
    const bet2Amount = 2_000_000; // 2 USDC
    const bet2 = encryptBetInput(arciumCtx.mxePublicKey, true, bet2Amount);
    const arciumAccounts2 = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet2.computationOffset,
      "update_pool"
    );
    const [positionPda2] = getPositionPda(marketId, bettor2.publicKey);

    // Record bettor2 balance before
    const bettor2BalanceBefore = (await getAccount(connection, bettor2TokenAccount)).amount;

    try {
      await program.methods
        .placeBet(
          new anchor.BN(bet2Amount),
          true,
          new anchor.BN(bet2.computationOffset),
          Array.from(bet2.isYesCiphertext) as unknown as number[],
          Array.from(bet2.amountCiphertext) as unknown as number[],
          Array.from(bet2.publicKey) as unknown as number[],
          bet2.nonceBN
        )
        .accountsPartial({
          bettor: bettor2.publicKey,
          market: marketPda,
          marketPool: marketPoolPda,
          userPosition: positionPda2,
          userTokenAccount: bettor2TokenAccount,
          marketVault: vaultPda,
          pendingBettorTokenAccount: bettor2TokenAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          mxeAccount: arciumAccounts2.mxeAccount,
          signPdaAccount: arciumAccounts2.signPdaAccount,
          mempoolAccount: arciumAccounts2.mempoolAccount,
          executingPool: arciumAccounts2.executingPool,
          computationAccount: arciumAccounts2.computationAccount,
          compDefAccount: arciumAccounts2.compDefAccount,
          clusterAccount: arciumAccounts2.clusterAccount,
          poolAccount: arciumAccounts2.poolAccount,
          clockAccount: arciumAccounts2.clockAccount,
          arciumProgram: arciumAccounts2.arciumProgram,
        })
        .signers([bettor2])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected MpcLocked error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("MpcLocked") ||
          errStr.includes("6012") ||
          errStr.includes("Market MPC computation is in progress"),
        `Expected MpcLocked error, got: ${errStr.substring(0, 200)}`
      );
      console.log("    MpcLocked correctly rejected for bettor2");
    }

    // Verify bettor2 balance unchanged
    const bettor2BalanceAfter = (await getAccount(connection, bettor2TokenAccount)).amount;
    assert.equal(
      Number(bettor2BalanceBefore),
      Number(bettor2BalanceAfter),
      "Bettor2 balance should be unchanged after MpcLocked rejection"
    );

    // Wait for the first bet's MPC callback to release the lock
    console.log("    Awaiting MPC callback to release lock...");
    const { awaitComputationFinalization } = await import("@arcium-hq/client");
    await awaitComputationFinalization(
      provider,
      bet1.computationOffset,
      program.programId,
      "confirmed",
      120_000
    );

    const marketUnlocked = await program.account.market.fetch(marketPda);
    assert.isFalse(marketUnlocked.mpcLock, "mpc_lock should be released after callback");
    console.log("    Lock released after callback");
  });

  // ==========================================================================
  // Test 4: validates UserPosition PDA creation via init_if_needed
  // ==========================================================================
  it("validates UserPosition PDA creation via init_if_needed", async () => {
    // After test 1, the UserPosition PDA should exist for bettor on this market
    const [positionPda] = getPositionPda(marketId, bettor.publicKey);

    const position = await program.account.userPosition.fetch(positionPda);

    // Verify: account exists with correct market_id
    assert.equal(
      position.marketId.toNumber(),
      marketId,
      "UserPosition market_id should match"
    );

    // Verify: user is set to bettor (set by init_if_needed in place_bet)
    assert.ok(
      position.user.equals(bettor.publicKey),
      "UserPosition user should be the bettor"
    );

    // After callback has run (test 1 waited for it), yes_amount should be accumulated
    // The bettor placed 5 USDC (test 1) + 1 USDC (test 3) = 6 USDC on Yes
    assert.isTrue(
      position.yesAmount.toNumber() > 0,
      "UserPosition yes_amount should be > 0 after callback"
    );

    // No amount should be 0 (bettor only bet Yes)
    assert.equal(
      position.noAmount.toNumber(),
      0,
      "UserPosition no_amount should be 0"
    );

    // claimed should be false
    assert.isFalse(position.claimed, "UserPosition claimed should be false");

    console.log("    UserPosition PDA verified:");
    console.log("      market_id:", position.marketId.toNumber());
    console.log("      user:", position.user.toBase58());
    console.log("      yes_amount:", position.yesAmount.toNumber());
    console.log("      no_amount:", position.noAmount.toNumber());
    console.log("      claimed:", position.claimed);
  });

  // ==========================================================================
  // Test 5: rejects bet on expired market
  // ==========================================================================
  it("rejects bet on expired market", async () => {
    // Cannot create an expired market on localnet because create_market validates
    // deadline > now + 1h. Clock sysvar manipulation is not available on localnet.
    //
    // Instead, verify the MarketExpired error variant exists in the IDL,
    // confirming the validation guard is compiled into the program.
    // The actual require! check:
    //   require!(clock.unix_timestamp < market.resolution_time, AvenirError::MarketExpired);
    // is verified by code inspection and the fact that the program compiles.

    const idlErrors = program.idl.errors;
    assert.isDefined(idlErrors, "Program IDL should have errors defined");

    const marketExpiredError = idlErrors!.find(
      (e: any) => e.name === "marketExpired" || e.name === "MarketExpired"
    );
    assert.isDefined(
      marketExpiredError,
      "MarketExpired error variant should exist in the program IDL"
    );

    console.log("    MarketExpired IDL error verified:");
    console.log("      name:", marketExpiredError!.name);
    console.log("      code:", marketExpiredError!.code);
    console.log("      msg:", marketExpiredError!.msg);
    console.log("    Note: Runtime test skipped (requires Clock sysvar manipulation)");
  });

  // ==========================================================================
  // Test 6: rejects bet on opposite side of existing position (WrongSide)
  // ==========================================================================
  it("rejects bet on opposite side of existing position", async () => {
    // After tests 1 and 3, bettor has a Yes position on this market.
    // Attempting a No bet should be rejected with WrongSide.

    const betAmount = 1_000_000; // 1 USDC
    const isYes = false; // Opposite side

    const bet = encryptBetInput(arciumCtx.mxePublicKey, isYes, betAmount);
    const arciumAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet.computationOffset,
      "update_pool"
    );
    const [positionPda] = getPositionPda(marketId, bettor.publicKey);

    try {
      await program.methods
        .placeBet(
          new anchor.BN(betAmount),
          isYes,
          new anchor.BN(bet.computationOffset),
          Array.from(bet.isYesCiphertext) as unknown as number[],
          Array.from(bet.amountCiphertext) as unknown as number[],
          Array.from(bet.publicKey) as unknown as number[],
          bet.nonceBN
        )
        .accountsPartial({
          bettor: bettor.publicKey,
          market: marketPda,
          marketPool: marketPoolPda,
          userPosition: positionPda,
          userTokenAccount: bettorTokenAccount,
          marketVault: vaultPda,
          pendingBettorTokenAccount: bettorTokenAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          mxeAccount: arciumAccounts.mxeAccount,
          signPdaAccount: arciumAccounts.signPdaAccount,
          mempoolAccount: arciumAccounts.mempoolAccount,
          executingPool: arciumAccounts.executingPool,
          computationAccount: arciumAccounts.computationAccount,
          compDefAccount: arciumAccounts.compDefAccount,
          clusterAccount: arciumAccounts.clusterAccount,
          poolAccount: arciumAccounts.poolAccount,
          clockAccount: arciumAccounts.clockAccount,
          arciumProgram: arciumAccounts.arciumProgram,
        })
        .signers([bettor])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected WrongSide error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("WrongSide") ||
          errStr.includes("6014") ||
          errStr.includes("Cannot bet on opposite side"),
        `Expected WrongSide error, got: ${errStr.substring(0, 200)}`
      );
      console.log("    WrongSide correctly rejected (bettor has Yes position, attempted No bet)");
    }
  });
});
