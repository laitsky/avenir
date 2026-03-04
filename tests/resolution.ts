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

import {
  setupArciumContext,
  encryptBetInput,
  createTestMarket,
  getArciumAccounts,
  initCompDef,
  getConfigPda,
  ArciumContext,
} from "./mpc/helpers";

describe("resolution & payouts", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.avenir as Program<Avenir>;
  const admin = provider.wallet as anchor.Wallet;
  const payer = admin.payer;
  const connection = provider.connection;

  // Test keypairs
  const creator = Keypair.generate();
  const userA = Keypair.generate(); // Will bet Yes
  const userB = Keypair.generate(); // Will bet No
  const mintAuthority = Keypair.generate();
  const feeRecipient = Keypair.generate();
  const protocolFeeBps = 200; // 2%

  // Will be set in before() hooks
  let usdcMint: PublicKey;
  let arciumCtx: ArciumContext;
  let userATokenAccount: PublicKey;
  let userBTokenAccount: PublicKey;
  let feeRecipientTokenAccount: PublicKey;

  // Config PDA
  const [configPda] = getConfigPda(program.programId);

  // Market state (set in before hook)
  let marketPda: PublicKey;
  let marketPoolPda: PublicKey;
  let vaultPda: PublicKey;
  let marketId: number;

  // Second market for MarketNotExpired test (with future deadline)
  let futureMarketPda: PublicKey;
  let futureMarketId: number;

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

  function getMarketPdaLocal(mktId: number): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(mktId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), buf],
      program.programId
    );
  }

  function getMarketPoolPdaLocal(mktId: number): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(mktId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market_pool"), buf],
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

    const airdropUserA = await connection.requestAirdrop(
      userA.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropUserA);

    const airdropUserB = await connection.requestAirdrop(
      userB.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropUserB);

    const airdropMintAuth = await connection.requestAirdrop(
      mintAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropMintAuth);

    const airdropFeeRecipient = await connection.requestAirdrop(
      feeRecipient.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropFeeRecipient);

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
        feeRecipient: feeRecipient.publicKey,
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

    // 6. Initialize comp_defs
    await initCompDef(program, payer, "init_pool", arciumCtx);
    await initCompDef(program, payer, "update_pool", arciumCtx);
    await initCompDef(program, payer, "compute_payouts", arciumCtx);

    // 7. Create market with short deadline (now + 5 seconds) for resolution testing
    const shortDeadline = Math.floor(Date.now() / 1000) + 5;
    const result = await createTestMarket(
      program,
      admin,
      creator,
      usdcMint,
      configPda,
      1, // expectedMarketId
      {
        question: "Will resolution tests pass?",
        resolutionTime: shortDeadline,
      }
    );
    marketPda = result.marketPda;
    marketPoolPda = result.marketPoolPda;
    vaultPda = result.vaultPda;
    marketId = result.marketId;

    // 8. Initialize pool via init_pool MPC
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

    // Wait for init_pool callback
    const { awaitComputationFinalization } = await import("@arcium-hq/client");
    await awaitComputationFinalization(
      provider,
      initPoolBet.computationOffset,
      program.programId,
      "confirmed",
      120_000
    );

    // 9. Create token accounts and mint USDC to users
    userATokenAccount = await createAssociatedTokenAccount(
      connection,
      userA,
      usdcMint,
      userA.publicKey
    );
    await mintTo(
      connection,
      mintAuthority,
      usdcMint,
      userATokenAccount,
      mintAuthority.publicKey,
      100_000_000 // 100 USDC
    );

    userBTokenAccount = await createAssociatedTokenAccount(
      connection,
      userB,
      usdcMint,
      userB.publicKey
    );
    await mintTo(
      connection,
      mintAuthority,
      usdcMint,
      userBTokenAccount,
      mintAuthority.publicKey,
      100_000_000 // 100 USDC
    );

    // 10. Create fee recipient token account
    feeRecipientTokenAccount = await createAssociatedTokenAccount(
      connection,
      feeRecipient,
      usdcMint,
      feeRecipient.publicKey
    );

    // 11. Create second market with far-future deadline for MarketNotExpired test
    const futureResult = await createTestMarket(
      program,
      admin,
      creator,
      usdcMint,
      configPda,
      2, // expectedMarketId
      {
        question: "Will this market have a future deadline?",
        resolutionTime: Math.floor(Date.now() / 1000) + 7200, // 2h from now
      }
    );
    futureMarketPda = futureResult.marketPda;
    futureMarketId = futureResult.marketId;

    console.log("  resolution test setup complete:");
    console.log("    USDC Mint:", usdcMint.toBase58());
    console.log("    Market ID:", marketId, "(short deadline)");
    console.log("    Future Market ID:", futureMarketId, "(2h deadline)");
    console.log("    User A:", userA.publicKey.toBase58());
    console.log("    User B:", userB.publicKey.toBase58());
    console.log("    Fee Recipient:", feeRecipient.publicKey.toBase58());
  });

  // ==========================================================================
  // Test 1: Place bets -- User A bets 10 USDC on Yes, User B bets 5 USDC on No
  // ==========================================================================
  it("places bets for resolution testing (User A: 10 USDC Yes, User B: 5 USDC No)", async () => {
    // --- User A bets 10 USDC on Yes ---
    const betAmountA = 10_000_000; // 10 USDC
    const betA = encryptBetInput(arciumCtx.mxePublicKey, true, betAmountA);
    const arciumAccountsA = getArciumAccounts(
      program.programId,
      arciumCtx,
      betA.computationOffset,
      "update_pool"
    );
    const [positionPdaA] = getPositionPda(marketId, userA.publicKey);

    await program.methods
      .placeBet(
        new anchor.BN(betAmountA),
        true,
        new anchor.BN(betA.computationOffset),
        Array.from(betA.isYesCiphertext) as unknown as number[],
        Array.from(betA.amountCiphertext) as unknown as number[],
        Array.from(betA.publicKey) as unknown as number[],
        betA.nonceBN
      )
      .accountsPartial({
        bettor: userA.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        userPosition: positionPdaA,
        userTokenAccount: userATokenAccount,
        marketVault: vaultPda,
        pendingBettorTokenAccount: userATokenAccount,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        mxeAccount: arciumAccountsA.mxeAccount,
        signPdaAccount: arciumAccountsA.signPdaAccount,
        mempoolAccount: arciumAccountsA.mempoolAccount,
        executingPool: arciumAccountsA.executingPool,
        computationAccount: arciumAccountsA.computationAccount,
        compDefAccount: arciumAccountsA.compDefAccount,
        clusterAccount: arciumAccountsA.clusterAccount,
        poolAccount: arciumAccountsA.poolAccount,
        clockAccount: arciumAccountsA.clockAccount,
        arciumProgram: arciumAccountsA.arciumProgram,
      })
      .signers([userA])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Await MPC callback for User A's bet
    console.log("    Awaiting MPC callback for User A bet...");
    const { awaitComputationFinalization } = await import("@arcium-hq/client");
    await awaitComputationFinalization(
      provider,
      betA.computationOffset,
      program.programId,
      "confirmed",
      120_000
    );
    console.log("    User A bet callback complete");

    // --- User B bets 5 USDC on No ---
    const betAmountB = 5_000_000; // 5 USDC
    const betB = encryptBetInput(arciumCtx.mxePublicKey, false, betAmountB);
    const arciumAccountsB = getArciumAccounts(
      program.programId,
      arciumCtx,
      betB.computationOffset,
      "update_pool"
    );
    const [positionPdaB] = getPositionPda(marketId, userB.publicKey);

    await program.methods
      .placeBet(
        new anchor.BN(betAmountB),
        false,
        new anchor.BN(betB.computationOffset),
        Array.from(betB.isYesCiphertext) as unknown as number[],
        Array.from(betB.amountCiphertext) as unknown as number[],
        Array.from(betB.publicKey) as unknown as number[],
        betB.nonceBN
      )
      .accountsPartial({
        bettor: userB.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        userPosition: positionPdaB,
        userTokenAccount: userBTokenAccount,
        marketVault: vaultPda,
        pendingBettorTokenAccount: userBTokenAccount,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        mxeAccount: arciumAccountsB.mxeAccount,
        signPdaAccount: arciumAccountsB.signPdaAccount,
        mempoolAccount: arciumAccountsB.mempoolAccount,
        executingPool: arciumAccountsB.executingPool,
        computationAccount: arciumAccountsB.computationAccount,
        compDefAccount: arciumAccountsB.compDefAccount,
        clusterAccount: arciumAccountsB.clusterAccount,
        poolAccount: arciumAccountsB.poolAccount,
        clockAccount: arciumAccountsB.clockAccount,
        arciumProgram: arciumAccountsB.arciumProgram,
      })
      .signers([userB])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Await MPC callback for User B's bet
    console.log("    Awaiting MPC callback for User B bet...");
    await awaitComputationFinalization(
      provider,
      betB.computationOffset,
      program.programId,
      "confirmed",
      120_000
    );
    console.log("    User B bet callback complete");

    // Verify both positions
    const posA = await program.account.userPosition.fetch(positionPdaA);
    assert.equal(posA.yesAmount.toNumber(), betAmountA, "User A yes_amount should be 10 USDC");
    assert.equal(posA.noAmount.toNumber(), 0, "User A no_amount should be 0");

    const posB = await program.account.userPosition.fetch(positionPdaB);
    assert.equal(posB.yesAmount.toNumber(), 0, "User B yes_amount should be 0");
    assert.equal(posB.noAmount.toNumber(), betAmountB, "User B no_amount should be 5 USDC");

    // Verify vault has 15 USDC total
    const vaultBalance = (await getAccount(connection, vaultPda)).amount;
    assert.equal(Number(vaultBalance), 15_000_000, "Vault should hold 15 USDC");

    console.log("    Bets placed: User A=10 USDC Yes, User B=5 USDC No");
    console.log("    Vault balance:", Number(vaultBalance));

    // Wait for the short deadline to pass (market created with now+5s)
    console.log("    Waiting for market deadline to pass...");
    await new Promise((r) => setTimeout(r, 6000));
    console.log("    Deadline should have passed");
  });

  // ==========================================================================
  // Test 2: resolve_market -- NotMarketCreator
  // ==========================================================================
  it("rejects resolve_market from non-creator (NotMarketCreator)", async () => {
    try {
      await program.methods
        .resolveMarket(1) // Yes wins
        .accountsPartial({
          creator: userA.publicKey, // userA is NOT the creator
          market: marketPda,
        })
        .signers([userA])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected NotMarketCreator error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("NotMarketCreator") ||
          errStr.includes("2012") ||
          errStr.includes("A seeds constraint was violated"),
        `Expected NotMarketCreator error, got: ${errStr.substring(0, 300)}`
      );
      console.log("    NotMarketCreator correctly rejected");
    }
  });

  // ==========================================================================
  // Test 3: resolve_market -- MarketNotExpired (using future-deadline market)
  // ==========================================================================
  it("rejects resolve_market before deadline (MarketNotExpired)", async () => {
    // Use the second market with a far-future deadline
    try {
      await program.methods
        .resolveMarket(1)
        .accountsPartial({
          creator: creator.publicKey,
          market: futureMarketPda,
        })
        .signers([creator])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected MarketNotExpired error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("MarketNotExpired") ||
          errStr.includes("6019") ||
          errStr.includes("Market deadline has not passed yet"),
        `Expected MarketNotExpired error, got: ${errStr.substring(0, 300)}`
      );
      console.log("    MarketNotExpired correctly rejected for future-deadline market");
    }
  });

  // ==========================================================================
  // Test 4: resolve_market -- InvalidOutcome
  // ==========================================================================
  it("rejects resolve_market with invalid outcome (InvalidOutcome)", async () => {
    try {
      await program.methods
        .resolveMarket(3) // Invalid: only 1 (Yes) or 2 (No) are valid
        .accountsPartial({
          creator: creator.publicKey,
          market: marketPda,
        })
        .signers([creator])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected InvalidOutcome error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("InvalidOutcome") ||
          errStr.includes("6020") ||
          errStr.includes("Invalid winning outcome"),
        `Expected InvalidOutcome error, got: ${errStr.substring(0, 300)}`
      );
      console.log("    InvalidOutcome correctly rejected (winning_outcome=3)");
    }
  });

  // ==========================================================================
  // Test 5: resolve_market -- success (Yes wins)
  // ==========================================================================
  it("resolves market with winning_outcome=1 (Yes wins)", async () => {
    await program.methods
      .resolveMarket(1) // Yes wins
      .accountsPartial({
        creator: creator.publicKey,
        market: marketPda,
      })
      .signers([creator])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Verify market state
    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.state, 2, "Market state should be Resolved (2)");
    assert.equal(market.winningOutcome, 1, "Winning outcome should be 1 (Yes)");

    console.log("    Market resolved successfully:");
    console.log("      state:", market.state, "(Resolved)");
    console.log("      winning_outcome:", market.winningOutcome, "(Yes)");
  });

  // ==========================================================================
  // Test 6: resolve_market -- cannot resolve already-resolved market
  // ==========================================================================
  it("rejects resolve_market on already-resolved market (MarketNotOpen)", async () => {
    try {
      await program.methods
        .resolveMarket(2) // Try No this time
        .accountsPartial({
          creator: creator.publicKey,
          market: marketPda,
        })
        .signers([creator])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected MarketNotOpen error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("MarketNotOpen") ||
          errStr.includes("6002") ||
          errStr.includes("Market is not in Open state"),
        `Expected MarketNotOpen error, got: ${errStr.substring(0, 300)}`
      );
      console.log("    MarketNotOpen correctly rejected (already resolved)");
    }
  });

  // ==========================================================================
  // Test 7: compute_payouts -- MPC reveals pool totals, transitions to Finalized
  // ==========================================================================
  it("computes payouts via MPC and transitions to Finalized (state=4)", async () => {
    const computeOffset = encryptBetInput(arciumCtx.mxePublicKey, true, 0).computationOffset;
    const arciumAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      computeOffset,
      "compute_payouts"
    );

    await program.methods
      .computePayouts(computeOffset)
      .accountsPartial({
        payer: payer.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        mxeAccount: arciumAccounts.mxeAccount,
        signPdaAccount: arciumAccounts.signPdaAccount,
        mempoolAccount: arciumAccounts.mempoolAccount,
        executingPool: arciumAccounts.executingPool,
        computationAccount: arciumAccounts.computationAccount,
        compDefAccount: arciumAccounts.compDefAccount,
        clusterAccount: arciumAccounts.clusterAccount,
        poolAccount: arciumAccounts.poolAccount,
        clockAccount: arciumAccounts.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: arciumAccounts.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Await MPC callback
    console.log("    Awaiting compute_payouts MPC callback...");
    const { awaitComputationFinalization } = await import("@arcium-hq/client");
    await awaitComputationFinalization(
      provider,
      computeOffset,
      program.programId,
      "confirmed",
      120_000
    );
    console.log("    compute_payouts callback complete");

    // Verify market state is Finalized with revealed pool totals
    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.state, 4, "Market state should be Finalized (4)");
    assert.equal(
      market.revealedYesPool.toNumber(),
      10_000_000,
      "Revealed yes pool should be 10 USDC (10,000,000)"
    );
    assert.equal(
      market.revealedNoPool.toNumber(),
      5_000_000,
      "Revealed no pool should be 5 USDC (5,000,000)"
    );
    assert.isFalse(market.mpcLock, "mpc_lock should be false after callback");

    console.log("    Market finalized:");
    console.log("      state:", market.state, "(Finalized)");
    console.log("      revealed_yes_pool:", market.revealedYesPool.toNumber());
    console.log("      revealed_no_pool:", market.revealedNoPool.toNumber());
    console.log("      mpc_lock:", market.mpcLock);
  });

  // ==========================================================================
  // Test 8: claim_payout -- winner (User A) receives correct proportional USDC
  // ==========================================================================
  it("pays winner (User A) correct proportional payout with fee deducted", async () => {
    // Expected payout math:
    //   total_pool    = 10_000_000 + 5_000_000 = 15_000_000
    //   winning_pool  = 10_000_000 (Yes pool, since Yes won)
    //   gross_payout  = 10_000_000 * 15_000_000 / 10_000_000 = 15_000_000
    //   fee           = 15_000_000 * 200 / 10_000 = 300_000
    //   net_payout    = 15_000_000 - 300_000 = 14_700_000

    const userABalanceBefore = (await getAccount(connection, userATokenAccount)).amount;
    const feeBalanceBefore = (await getAccount(connection, feeRecipientTokenAccount)).amount;

    const [positionPdaA] = getPositionPda(marketId, userA.publicKey);

    await program.methods
      .claimPayout()
      .accountsPartial({
        winner: userA.publicKey,
        market: marketPda,
        userPosition: positionPdaA,
        marketVault: vaultPda,
        winnerTokenAccount: userATokenAccount,
        feeRecipientTokenAccount: feeRecipientTokenAccount,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([userA])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Verify User A received net payout (14.7 USDC)
    const userABalanceAfter = (await getAccount(connection, userATokenAccount)).amount;
    const userAGain = Number(userABalanceAfter - userABalanceBefore);
    assert.equal(userAGain, 14_700_000, "User A should receive 14.7 USDC net payout");

    // Verify fee recipient received fee (0.3 USDC)
    const feeBalanceAfter = (await getAccount(connection, feeRecipientTokenAccount)).amount;
    const feeGain = Number(feeBalanceAfter - feeBalanceBefore);
    assert.equal(feeGain, 300_000, "Fee recipient should receive 0.3 USDC fee");

    // Verify position marked as claimed
    const position = await program.account.userPosition.fetch(positionPdaA);
    assert.isTrue(position.claimed, "User A position should be marked as claimed");

    console.log("    Winner claim successful:");
    console.log("      User A net payout:", userAGain, "(14.7 USDC)");
    console.log("      Fee collected:", feeGain, "(0.3 USDC)");
    console.log("      Position claimed:", position.claimed);
  });

  // ==========================================================================
  // Test 9: claim_payout -- loser (User B) rejected with NoWinningPosition
  // ==========================================================================
  it("rejects loser claim (User B bet No, Yes won) with NoWinningPosition", async () => {
    const [positionPdaB] = getPositionPda(marketId, userB.publicKey);

    try {
      await program.methods
        .claimPayout()
        .accountsPartial({
          winner: userB.publicKey,
          market: marketPda,
          userPosition: positionPdaB,
          marketVault: vaultPda,
          winnerTokenAccount: userBTokenAccount,
          feeRecipientTokenAccount: feeRecipientTokenAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([userB])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected NoWinningPosition error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("NoWinningPosition") ||
          errStr.includes("6017") ||
          errStr.includes("No winning position to claim"),
        `Expected NoWinningPosition error, got: ${errStr.substring(0, 300)}`
      );
      console.log("    NoWinningPosition correctly rejected (User B bet No, Yes won)");
    }
  });

  // ==========================================================================
  // Test 10: claim_payout -- double claim rejected with AlreadyClaimed
  // ==========================================================================
  it("rejects double claim (User A already claimed) with AlreadyClaimed", async () => {
    const [positionPdaA] = getPositionPda(marketId, userA.publicKey);

    try {
      await program.methods
        .claimPayout()
        .accountsPartial({
          winner: userA.publicKey,
          market: marketPda,
          userPosition: positionPdaA,
          marketVault: vaultPda,
          winnerTokenAccount: userATokenAccount,
          feeRecipientTokenAccount: feeRecipientTokenAccount,
          usdcMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([userA])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Expected AlreadyClaimed error");
    } catch (e: any) {
      const errStr = e.toString();
      assert.isTrue(
        errStr.includes("AlreadyClaimed") ||
          errStr.includes("6018") ||
          errStr.includes("Payout has already been claimed"),
        `Expected AlreadyClaimed error, got: ${errStr.substring(0, 300)}`
      );
      console.log("    AlreadyClaimed correctly rejected (User A already claimed)");
    }
  });
});
