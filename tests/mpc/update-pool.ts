import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Avenir } from "../../target/types/avenir";
import { assert } from "chai";
import {
  getComputationAccAddress,
  getCompDefAccOffset,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";

import {
  setupArciumContext,
  encryptBetInput,
  awaitAndVerifyCallback,
  createTestMarket,
  getArciumAccounts,
  initCompDef,
  getConfigPda,
  ArciumContext,
} from "./helpers";

// NOTE: The standalone `updatePool` instruction was removed from the program surface
// to prevent unsafe pool mutations without corresponding USDC transfers.
// These MPC-only tests are kept for reference but skipped until they are migrated
// to the production `placeBet` flow.
describe.skip("update-pool: encrypted state relay integration test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.avenir as Program<Avenir>;
  const admin = provider.wallet as anchor.Wallet;
  const payer = admin.payer;
  const connection = provider.connection;

  // Test keypairs
  const creator = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const feeRecipient = Keypair.generate().publicKey;
  const protocolFeeBps = 200; // 2%

  // Will be set in before() hooks
  let usdcMint: PublicKey;
  let arciumCtx: ArciumContext;

  // Config PDA
  const [configPda] = getConfigPda(program.programId);

  // Market state shared across tests (set in Test 1)
  let marketPda: PublicKey;
  let marketPoolPda: PublicKey;
  let marketId: number;

  // Snapshot values for comparing ciphertext changes
  let initPoolYesCiphertext: number[];
  let initPoolNoCiphertext: number[];
  let initPoolNonce: anchor.BN;

  before(async () => {
    // 1. Airdrop SOL to test accounts
    const airdropCreator = await connection.requestAirdrop(
      creator.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropCreator);

    const airdropMintAuth = await connection.requestAirdrop(
      mintAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropMintAuth);

    // 2. Create USDC mint (6 decimals like real USDC)
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
      .accounts({
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
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        whitelist: whitelistPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    // 5. Setup Arcium context
    arciumCtx = await setupArciumContext(provider, program.programId);

    // 6. Initialize comp_defs for init_pool and update_pool
    await initCompDef(program, payer, "init_pool", arciumCtx);
    await initCompDef(program, payer, "update_pool", arciumCtx);

    console.log("  Test setup complete:");
    console.log("    USDC Mint:", usdcMint.toBase58());
    console.log("    Creator:", creator.publicKey.toBase58());
    console.log("    Admin:", admin.publicKey.toBase58());
  });

  // ==========================================================================
  // Test 1: init_pool creates zero-valued encrypted pool state
  // ==========================================================================
  it("init_pool creates zero-valued encrypted pool state", async () => {
    // Create a market (market_counter starts at 0, first market = id 1)
    const result = await createTestMarket(
      program,
      admin,
      creator,
      usdcMint,
      configPda,
      1 // expectedMarketId
    );
    marketPda = result.marketPda;
    marketPoolPda = result.marketPoolPda;
    marketId = result.marketId;

    console.log("    Market created, id:", marketId);
    console.log("    MarketPool PDA:", marketPoolPda.toBase58());

    // Verify MarketPool is zero-filled before init_pool
    const poolBefore = await program.account.marketPool.fetch(marketPoolPda);
    assert.deepEqual(
      Array.from(poolBefore.yesPoolEncrypted),
      Array(32).fill(0),
      "yes_pool should be zero bytes before init_pool"
    );
    assert.deepEqual(
      Array.from(poolBefore.noPoolEncrypted),
      Array(32).fill(0),
      "no_pool should be zero bytes before init_pool"
    );

    // Queue init_pool computation
    const computationOffset = new anchor.BN(randomBytes(8), "hex");
    const arciumAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      computationOffset,
      "init_pool"
    );

    await program.methods
      .initPool(computationOffset)
      .accountsPartial({
        payer: payer.publicKey,
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

    console.log("    init_pool queued, awaiting MPC finalization...");

    // Await callback finalization
    const callbackTx = await awaitAndVerifyCallback(
      provider,
      computationOffset,
      program.programId
    );
    console.log("    init_pool callback tx:", callbackTx);

    // Fetch MarketPool after init_pool callback
    const poolAfter = await program.account.marketPool.fetch(marketPoolPda);

    // Verify: yes_pool_encrypted and no_pool_encrypted are non-zero
    // (they are encrypted zeros, not literal zero bytes)
    const yesPoolArr = Array.from(poolAfter.yesPoolEncrypted);
    const noPoolArr = Array.from(poolAfter.noPoolEncrypted);

    const isYesNonZero = yesPoolArr.some((b) => b !== 0);
    const isNoNonZero = noPoolArr.some((b) => b !== 0);
    assert.isTrue(
      isYesNonZero,
      "yes_pool_encrypted should be non-zero after init_pool (encrypted zero)"
    );
    assert.isTrue(
      isNoNonZero,
      "no_pool_encrypted should be non-zero after init_pool (encrypted zero)"
    );

    // Verify: nonce was written (non-zero)
    const nonceVal = poolAfter.nonce;
    assert.isTrue(
      nonceVal.gt(new anchor.BN(0)),
      "nonce should be non-zero after init_pool"
    );

    // Save snapshot for comparison in subsequent tests
    initPoolYesCiphertext = yesPoolArr;
    initPoolNoCiphertext = noPoolArr;
    initPoolNonce = nonceVal;

    console.log("    init_pool PASSED: encrypted zeros written to MarketPool");
    console.log("    nonce:", nonceVal.toString());
  });

  // ==========================================================================
  // Test 2: update_pool accumulates a single bet correctly
  // ==========================================================================
  it("update_pool accumulates a single bet correctly", async () => {
    // Encrypt a bet input: { is_yes: true, amount: 1_000_000 } (1 USDC)
    const bet = encryptBetInput(arciumCtx.mxePublicKey, true, 1_000_000);

    const arciumAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet.computationOffset,
      "update_pool"
    );

    // Queue update_pool computation
    await program.methods
      .updatePool(
        bet.computationOffset,
        bet.isYesCiphertext as unknown as number[],
        bet.amountCiphertext as unknown as number[],
        Array.from(bet.publicKey) as unknown as number[],
        bet.nonceBN
      )
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

    console.log("    update_pool (bet 1: Yes 1 USDC) queued, awaiting...");

    // Await callback
    const callbackTx = await awaitAndVerifyCallback(
      provider,
      bet.computationOffset,
      program.programId
    );
    console.log("    update_pool callback tx:", callbackTx);

    // Fetch MarketPool
    const pool = await program.account.marketPool.fetch(marketPoolPda);
    const yesPoolArr = Array.from(pool.yesPoolEncrypted);
    const noPoolArr = Array.from(pool.noPoolEncrypted);

    // Verify: yes_pool_encrypted changed from init_pool value
    const yesChanged = yesPoolArr.some(
      (b, i) => b !== initPoolYesCiphertext[i]
    );
    assert.isTrue(
      yesChanged,
      "yes_pool_encrypted should change after update_pool"
    );

    // Verify: nonce updated (different from init_pool nonce)
    assert.isFalse(
      pool.nonce.eq(initPoolNonce),
      "nonce should change after update_pool"
    );

    // Fetch Market
    const market = await program.account.market.fetch(marketPda);

    // Verify: sentiment is 1 (Leaning Yes -- only bet is on Yes side)
    assert.equal(market.sentiment, 1, "sentiment should be 1 (Leaning Yes)");

    // Verify: mpc_lock is false (released by callback)
    assert.equal(market.mpcLock, false, "mpc_lock should be released");

    // Verify: total_bets is 1
    assert.equal(market.totalBets.toNumber(), 1, "total_bets should be 1");

    console.log("    update_pool (bet 1) PASSED:");
    console.log("      sentiment:", market.sentiment, "(Leaning Yes)");
    console.log("      total_bets:", market.totalBets.toNumber());
    console.log("      mpc_lock:", market.mpcLock);
  });

  // ==========================================================================
  // Test 3: update_pool handles sequential bets and sentiment transitions
  // ==========================================================================
  it("update_pool handles sequential bets and sentiment transitions", async () => {
    // Save ciphertext snapshot before this test
    const poolBefore = await program.account.marketPool.fetch(marketPoolPda);
    const prevNonce = poolBefore.nonce;

    // ---- Bet 2: No, 2 USDC ----
    const bet2 = encryptBetInput(arciumCtx.mxePublicKey, false, 2_000_000);
    const accounts2 = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet2.computationOffset,
      "update_pool"
    );

    await program.methods
      .updatePool(
        bet2.computationOffset,
        bet2.isYesCiphertext as unknown as number[],
        bet2.amountCiphertext as unknown as number[],
        Array.from(bet2.publicKey) as unknown as number[],
        bet2.nonceBN
      )
      .accountsPartial({
        payer: payer.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        mxeAccount: accounts2.mxeAccount,
        signPdaAccount: accounts2.signPdaAccount,
        mempoolAccount: accounts2.mempoolAccount,
        executingPool: accounts2.executingPool,
        computationAccount: accounts2.computationAccount,
        compDefAccount: accounts2.compDefAccount,
        clusterAccount: accounts2.clusterAccount,
        poolAccount: accounts2.poolAccount,
        clockAccount: accounts2.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: accounts2.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("    update_pool (bet 2: No 2 USDC) queued, awaiting...");

    const callbackTx2 = await awaitAndVerifyCallback(
      provider,
      bet2.computationOffset,
      program.programId
    );
    console.log("    bet 2 callback tx:", callbackTx2);

    // Verify after bet 2
    const market2 = await program.account.market.fetch(marketPda);
    const pool2 = await program.account.marketPool.fetch(marketPoolPda);

    // sentiment should be 3 (Leaning No -- 2 USDC No vs 1 USDC Yes)
    assert.equal(
      market2.sentiment,
      3,
      "sentiment should be 3 (Leaning No) after bet 2"
    );
    assert.equal(market2.totalBets.toNumber(), 2, "total_bets should be 2");
    assert.isFalse(
      pool2.nonce.eq(prevNonce),
      "nonce should change after bet 2"
    );

    console.log("    bet 2 PASSED: sentiment=3 (Leaning No), total_bets=2");

    // ---- Bet 3: Yes, 1 USDC (to reach Even: 2 USDC Yes vs 2 USDC No) ----
    const bet3 = encryptBetInput(arciumCtx.mxePublicKey, true, 1_000_000);
    const accounts3 = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet3.computationOffset,
      "update_pool"
    );

    const nonceBet2 = pool2.nonce;

    await program.methods
      .updatePool(
        bet3.computationOffset,
        bet3.isYesCiphertext as unknown as number[],
        bet3.amountCiphertext as unknown as number[],
        Array.from(bet3.publicKey) as unknown as number[],
        bet3.nonceBN
      )
      .accountsPartial({
        payer: payer.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        mxeAccount: accounts3.mxeAccount,
        signPdaAccount: accounts3.signPdaAccount,
        mempoolAccount: accounts3.mempoolAccount,
        executingPool: accounts3.executingPool,
        computationAccount: accounts3.computationAccount,
        compDefAccount: accounts3.compDefAccount,
        clusterAccount: accounts3.clusterAccount,
        poolAccount: accounts3.poolAccount,
        clockAccount: accounts3.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: accounts3.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("    update_pool (bet 3: Yes 1 USDC) queued, awaiting...");

    const callbackTx3 = await awaitAndVerifyCallback(
      provider,
      bet3.computationOffset,
      program.programId
    );
    console.log("    bet 3 callback tx:", callbackTx3);

    // Verify after bet 3
    const market3 = await program.account.market.fetch(marketPda);
    const pool3 = await program.account.marketPool.fetch(marketPoolPda);

    // sentiment should be 2 (Even -- 2 USDC on each side)
    assert.equal(
      market3.sentiment,
      2,
      "sentiment should be 2 (Even) after bet 3"
    );
    assert.equal(market3.totalBets.toNumber(), 3, "total_bets should be 3");
    assert.isFalse(
      pool3.nonce.eq(nonceBet2),
      "nonce should change after bet 3"
    );

    console.log("    bet 3 PASSED: sentiment=2 (Even), total_bets=3");
    console.log(
      "    Sentiment transitions validated: Leaning Yes -> Leaning No -> Even"
    );
  });

  // ==========================================================================
  // Test 4: update_pool rejects when mpc_lock is active
  // ==========================================================================
  it("update_pool rejects when mpc_lock is active", async () => {
    // Strategy: Queue a computation, then immediately try to queue another
    // before the first callback completes. The second should fail with MpcLocked.

    // First bet -- queue normally
    const bet1 = encryptBetInput(arciumCtx.mxePublicKey, true, 500_000);
    const accounts1 = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet1.computationOffset,
      "update_pool"
    );

    await program.methods
      .updatePool(
        bet1.computationOffset,
        bet1.isYesCiphertext as unknown as number[],
        bet1.amountCiphertext as unknown as number[],
        Array.from(bet1.publicKey) as unknown as number[],
        bet1.nonceBN
      )
      .accountsPartial({
        payer: payer.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        mxeAccount: accounts1.mxeAccount,
        signPdaAccount: accounts1.signPdaAccount,
        mempoolAccount: accounts1.mempoolAccount,
        executingPool: accounts1.executingPool,
        computationAccount: accounts1.computationAccount,
        compDefAccount: accounts1.compDefAccount,
        clusterAccount: accounts1.clusterAccount,
        poolAccount: accounts1.poolAccount,
        clockAccount: accounts1.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: accounts1.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("    First update_pool queued (mpc_lock should now be true)");

    // Verify mpc_lock is set
    const marketLocked = await program.account.market.fetch(marketPda);
    assert.isTrue(
      marketLocked.mpcLock,
      "mpc_lock should be true while MPC is in progress"
    );

    // Immediately try to queue another update_pool -- should fail
    const bet2 = encryptBetInput(arciumCtx.mxePublicKey, false, 500_000);
    const accounts2 = getArciumAccounts(
      program.programId,
      arciumCtx,
      bet2.computationOffset,
      "update_pool"
    );

    try {
      await program.methods
        .updatePool(
          bet2.computationOffset,
          bet2.isYesCiphertext as unknown as number[],
          bet2.amountCiphertext as unknown as number[],
          Array.from(bet2.publicKey) as unknown as number[],
          bet2.nonceBN
        )
        .accountsPartial({
          payer: payer.publicKey,
          market: marketPda,
          marketPool: marketPoolPda,
          mxeAccount: accounts2.mxeAccount,
          signPdaAccount: accounts2.signPdaAccount,
          mempoolAccount: accounts2.mempoolAccount,
          executingPool: accounts2.executingPool,
          computationAccount: accounts2.computationAccount,
          compDefAccount: accounts2.compDefAccount,
          clusterAccount: accounts2.clusterAccount,
          poolAccount: accounts2.poolAccount,
          clockAccount: accounts2.clockAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: accounts2.arciumProgram,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      assert.fail("Should have thrown MpcLocked error");
    } catch (err: any) {
      const errStr = err.toString();
      assert.isTrue(
        errStr.includes("MpcLocked") ||
          errStr.includes("6011") ||
          errStr.includes("Market MPC computation is in progress"),
        `Expected MpcLocked error, got: ${errStr.substring(0, 200)}`
      );
      console.log("    Second update_pool correctly rejected with MpcLocked");
    }

    // Clean up: wait for the first computation to finish so mpc_lock is released
    console.log(
      "    Awaiting first computation callback to release mpc_lock..."
    );
    await awaitAndVerifyCallback(
      provider,
      bet1.computationOffset,
      program.programId
    );

    // Verify mpc_lock is released
    const marketUnlocked = await program.account.market.fetch(marketPda);
    assert.isFalse(
      marketUnlocked.mpcLock,
      "mpc_lock should be released after callback"
    );

    console.log(
      "    mpc_lock test PASSED: concurrent access correctly prevented"
    );
  });
});
