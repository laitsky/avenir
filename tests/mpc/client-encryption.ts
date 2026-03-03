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
  RescueCipher,
  x25519,
  getMXEPublicKey,
  deserializeLE,
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

describe("client-encryption: @arcium-hq/client SDK validation", () => {
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

  // Market state shared across Tests 3 and 4
  let marketPda: PublicKey;
  let marketPoolPda: PublicKey;
  let marketId: number;

  // MXE public key for direct SDK usage
  let mxePublicKey: Uint8Array;

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
    mxePublicKey = arciumCtx.mxePublicKey;

    // 6. Initialize comp_defs for init_pool and update_pool
    await initCompDef(program, payer, "init_pool", arciumCtx);
    await initCompDef(program, payer, "update_pool", arciumCtx);

    // 7. Create a market and initialize encrypted pool state
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

    // 8. Run init_pool to initialize encrypted pool state
    const initOffset = new anchor.BN(randomBytes(8), "hex");
    const initAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      initOffset,
      "init_pool"
    );

    await program.methods
      .initPool(initOffset)
      .accountsPartial({
        payer: payer.publicKey,
        marketPool: marketPoolPda,
        mxeAccount: initAccounts.mxeAccount,
        signPdaAccount: initAccounts.signPdaAccount,
        mempoolAccount: initAccounts.mempoolAccount,
        executingPool: initAccounts.executingPool,
        computationAccount: initAccounts.computationAccount,
        compDefAccount: initAccounts.compDefAccount,
        clusterAccount: initAccounts.clusterAccount,
        poolAccount: initAccounts.poolAccount,
        clockAccount: initAccounts.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: initAccounts.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    await awaitAndVerifyCallback(provider, initOffset, program.programId);

    console.log("  Test setup complete:");
    console.log("    USDC Mint:", usdcMint.toBase58());
    console.log("    Market ID:", marketId);
    console.log("    MarketPool PDA:", marketPoolPda.toBase58());
    console.log("    MXE public key length:", mxePublicKey.length);
  });

  // ==========================================================================
  // Test 1: x25519 key exchange produces valid shared secret
  // ==========================================================================
  it("x25519 key exchange produces valid shared secret", async () => {
    // 1. Generate x25519 private key -- direct SDK usage
    const privateKey = x25519.utils.randomPrivateKey();
    assert.equal(privateKey.length, 32, "private key should be 32 bytes");

    // 2. Derive public key
    const publicKey = x25519.getPublicKey(privateKey);
    assert.equal(publicKey.length, 32, "public key should be 32 bytes");

    // 3. Get MXE public key via getMXEPublicKey
    const fetchedMxePublicKey = await getMXEPublicKey(
      provider,
      program.programId
    );
    assert.isNotNull(fetchedMxePublicKey, "MXE public key should not be null");
    assert.equal(
      fetchedMxePublicKey.length,
      32,
      "MXE public key should be 32 bytes"
    );

    // 4. Derive shared secret
    const sharedSecret = x25519.getSharedSecret(privateKey, fetchedMxePublicKey);

    // 5. Verify: shared secret is 32 bytes
    assert.equal(sharedSecret.length, 32, "shared secret should be 32 bytes");

    // 6. Verify: shared secret is not all zeros
    const isNonZero = Array.from(sharedSecret).some((b) => b !== 0);
    assert.isTrue(isNonZero, "shared secret should not be all zeros");

    // 7. Verify: different private keys produce different shared secrets
    const privateKey2 = x25519.utils.randomPrivateKey();
    const sharedSecret2 = x25519.getSharedSecret(privateKey2, fetchedMxePublicKey);
    const isDifferent = Array.from(sharedSecret).some(
      (b, i) => b !== sharedSecret2[i]
    );
    assert.isTrue(
      isDifferent,
      "different private keys should produce different shared secrets"
    );

    console.log("    x25519 key exchange PASSED:");
    console.log("      private key: 32 bytes");
    console.log("      public key: 32 bytes");
    console.log("      MXE public key: 32 bytes");
    console.log("      shared secret: 32 bytes, non-zero, unique per keypair");
  });

  // ==========================================================================
  // Test 2: RescueCipher encrypts bet input into 32-byte ciphertext arrays
  // ==========================================================================
  it("RescueCipher encrypts bet input into 32-byte ciphertext arrays", async () => {
    // 1. Generate keypair and derive shared secret
    const privateKey = x25519.utils.randomPrivateKey();
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);

    // 2. Create RescueCipher with shared secret
    const cipher = new RescueCipher(sharedSecret);

    // 3. Prepare plaintext: [is_yes=true (1), amount=1_000_000 (1 USDC)]
    const plaintext = [BigInt(1), BigInt(1_000_000)];

    // 4. Generate 16-byte random nonce
    const nonce = randomBytes(16);
    assert.equal(nonce.length, 16, "nonce should be 16 bytes");

    // 5. Encrypt
    const ciphertext = cipher.encrypt(plaintext, nonce);

    // 6. Verify: result has 2 elements (one per plaintext value)
    assert.equal(ciphertext.length, 2, "ciphertext should have 2 elements");

    // 7. Verify: each ciphertext element is 32 bytes
    assert.equal(
      ciphertext[0].length,
      32,
      "ciphertext[0] (is_yes) should be 32 bytes"
    );
    assert.equal(
      ciphertext[1].length,
      32,
      "ciphertext[1] (amount) should be 32 bytes"
    );

    // 8. Verify: ciphertext is not all zeros
    const ct0NonZero = Array.from(ciphertext[0]).some((b) => b !== 0);
    const ct1NonZero = Array.from(ciphertext[1]).some((b) => b !== 0);
    assert.isTrue(ct0NonZero, "encrypted is_yes should not be all zeros");
    assert.isTrue(ct1NonZero, "encrypted amount should not be all zeros");

    // 9. Verify: encrypting same plaintext with different nonce produces different ciphertext
    const nonce2 = randomBytes(16);
    const ciphertext2 = cipher.encrypt(plaintext, nonce2);
    const isDifferent0 = Array.from(ciphertext[0]).some(
      (b, i) => b !== ciphertext2[0][i]
    );
    const isDifferent1 = Array.from(ciphertext[1]).some(
      (b, i) => b !== ciphertext2[1][i]
    );
    assert.isTrue(
      isDifferent0,
      "same plaintext with different nonce should produce different ciphertext[0]"
    );
    assert.isTrue(
      isDifferent1,
      "same plaintext with different nonce should produce different ciphertext[1]"
    );

    // 10. Verify: encrypting different plaintext with same nonce produces different ciphertext
    const plaintext2 = [BigInt(0), BigInt(2_000_000)];
    const ciphertext3 = cipher.encrypt(plaintext2, nonce);
    const isDiffPlaintext = Array.from(ciphertext[0]).some(
      (b, i) => b !== ciphertext3[0][i]
    );
    assert.isTrue(
      isDiffPlaintext,
      "different plaintext should produce different ciphertext"
    );

    console.log("    RescueCipher encryption PASSED:");
    console.log("      2 ciphertext elements, each 32 bytes");
    console.log("      non-zero, nonce-dependent, plaintext-dependent");
  });

  // ==========================================================================
  // Test 3: client-encrypted ciphertext is consumed by update_pool MPC circuit
  // ==========================================================================
  it("client-encrypted ciphertext is consumed by update_pool MPC circuit", async () => {
    // This is the key integration test: proving @arcium-hq/client encryption
    // is compatible with the Arcis circuit. Uses direct SDK calls (no helper).

    // 1. Generate x25519 keypair -- direct SDK usage
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);

    // 2. Derive shared secret with MXE
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);

    // 3. Create RescueCipher
    const cipher = new RescueCipher(sharedSecret);

    // 4. Encrypt: { is_yes: true, amount: 5_000_000 } (5 USDC on Yes)
    const nonce = randomBytes(16);
    const isYesCiphertext = cipher.encrypt([BigInt(1)], nonce);
    const amountCiphertext = cipher.encrypt([BigInt(5_000_000)], nonce);

    // 5. Generate computation offset
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    // 6. Submit to update_pool instruction with all encrypted args
    const arciumAccounts = getArciumAccounts(
      program.programId,
      arciumCtx,
      computationOffset,
      "update_pool"
    );

    await program.methods
      .updatePool(
        computationOffset,
        Array.from(isYesCiphertext[0]) as unknown as number[],
        Array.from(amountCiphertext[0]) as unknown as number[],
        Array.from(publicKey) as unknown as number[],
        new anchor.BN(deserializeLE(nonce).toString())
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

    console.log("    update_pool (client-encrypted: Yes 5 USDC) queued, awaiting MPC...");

    // 7. Await MPC finalization
    const callbackTx = await awaitAndVerifyCallback(
      provider,
      computationOffset,
      program.programId
    );
    console.log("    callback tx:", callbackTx);

    // 8. Fetch Market account
    const market = await program.account.market.fetch(marketPda);

    // 9. Verify: sentiment is 1 (Leaning Yes -- only bet, all 5 USDC on Yes)
    assert.equal(
      market.sentiment,
      1,
      "sentiment should be 1 (Leaning Yes) after 5 USDC Yes bet"
    );

    // 10. Verify: mpc_lock is false (released by callback)
    assert.equal(market.mpcLock, false, "mpc_lock should be released");

    // 11. Verify: total_bets incremented
    assert.equal(
      market.totalBets.toNumber(),
      1,
      "total_bets should be 1 after first bet"
    );

    console.log("    client-encrypted update_pool PASSED:");
    console.log("      sentiment:", market.sentiment, "(Leaning Yes)");
    console.log("      total_bets:", market.totalBets.toNumber());
    console.log("      mpc_lock:", market.mpcLock);
    console.log("    INF-07 VALIDATED: @arcium-hq/client encryption consumed by MPC circuit");
  });

  // ==========================================================================
  // Test 4: multiple client-encrypted bets from different keypairs work correctly
  // ==========================================================================
  it("multiple client-encrypted bets from different keypairs work correctly", async () => {
    // This test validates that different users (different x25519 keypairs)
    // can all submit encrypted bets to the same pool. Each user has a unique
    // shared secret with the MXE.

    // State after Test 3: Yes=5 USDC, No=0 USDC, sentiment=1 (Leaning Yes)

    // ---- User A: bet 3 USDC on Yes (different keypair from Test 3) ----
    const privateKeyA = x25519.utils.randomPrivateKey();
    const publicKeyA = x25519.getPublicKey(privateKeyA);
    const sharedSecretA = x25519.getSharedSecret(privateKeyA, mxePublicKey);
    const cipherA = new RescueCipher(sharedSecretA);

    const nonceA = randomBytes(16);
    const isYesCtA = cipherA.encrypt([BigInt(1)], nonceA);
    const amountCtA = cipherA.encrypt([BigInt(3_000_000)], nonceA);
    const offsetA = new anchor.BN(randomBytes(8), "hex");

    const accountsA = getArciumAccounts(
      program.programId,
      arciumCtx,
      offsetA,
      "update_pool"
    );

    await program.methods
      .updatePool(
        offsetA,
        Array.from(isYesCtA[0]) as unknown as number[],
        Array.from(amountCtA[0]) as unknown as number[],
        Array.from(publicKeyA) as unknown as number[],
        new anchor.BN(deserializeLE(nonceA).toString())
      )
      .accountsPartial({
        payer: payer.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        mxeAccount: accountsA.mxeAccount,
        signPdaAccount: accountsA.signPdaAccount,
        mempoolAccount: accountsA.mempoolAccount,
        executingPool: accountsA.executingPool,
        computationAccount: accountsA.computationAccount,
        compDefAccount: accountsA.compDefAccount,
        clusterAccount: accountsA.clusterAccount,
        poolAccount: accountsA.poolAccount,
        clockAccount: accountsA.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: accountsA.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("    User A (Yes 3 USDC) queued, awaiting MPC...");

    await awaitAndVerifyCallback(provider, offsetA, program.programId);

    // After User A: Yes=8, No=0 -> Leaning Yes (1)
    const marketA = await program.account.market.fetch(marketPda);
    assert.equal(
      marketA.sentiment,
      1,
      "sentiment should be 1 (Leaning Yes) after User A: Yes=8, No=0"
    );
    assert.equal(marketA.totalBets.toNumber(), 2, "total_bets should be 2");
    assert.equal(marketA.mpcLock, false, "mpc_lock should be released after User A");

    console.log("    User A PASSED: sentiment=1 (Leaning Yes), total_bets=2");

    // ---- User B: bet 8 USDC on No (completely different keypair) ----
    const privateKeyB = x25519.utils.randomPrivateKey();
    const publicKeyB = x25519.getPublicKey(privateKeyB);
    const sharedSecretB = x25519.getSharedSecret(privateKeyB, mxePublicKey);
    const cipherB = new RescueCipher(sharedSecretB);

    // Verify User B has a different shared secret than User A
    const secretsDiffer = Array.from(sharedSecretA).some(
      (b, i) => b !== sharedSecretB[i]
    );
    assert.isTrue(
      secretsDiffer,
      "User A and B should have different shared secrets"
    );

    const nonceB = randomBytes(16);
    const isYesCtB = cipherB.encrypt([BigInt(0)], nonceB); // is_yes = false (No bet)
    const amountCtB = cipherB.encrypt([BigInt(8_000_000)], nonceB); // 8 USDC
    const offsetB = new anchor.BN(randomBytes(8), "hex");

    const accountsB = getArciumAccounts(
      program.programId,
      arciumCtx,
      offsetB,
      "update_pool"
    );

    await program.methods
      .updatePool(
        offsetB,
        Array.from(isYesCtB[0]) as unknown as number[],
        Array.from(amountCtB[0]) as unknown as number[],
        Array.from(publicKeyB) as unknown as number[],
        new anchor.BN(deserializeLE(nonceB).toString())
      )
      .accountsPartial({
        payer: payer.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        mxeAccount: accountsB.mxeAccount,
        signPdaAccount: accountsB.signPdaAccount,
        mempoolAccount: accountsB.mempoolAccount,
        executingPool: accountsB.executingPool,
        computationAccount: accountsB.computationAccount,
        compDefAccount: accountsB.compDefAccount,
        clusterAccount: accountsB.clusterAccount,
        poolAccount: accountsB.poolAccount,
        clockAccount: accountsB.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: accountsB.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("    User B (No 8 USDC) queued, awaiting MPC...");

    await awaitAndVerifyCallback(provider, offsetB, program.programId);

    // After User B: Yes=8, No=8 -> Even (2)
    const marketB = await program.account.market.fetch(marketPda);
    assert.equal(
      marketB.sentiment,
      2,
      "sentiment should be 2 (Even) after User B: Yes=8, No=8"
    );
    assert.equal(marketB.totalBets.toNumber(), 3, "total_bets should be 3");
    assert.equal(marketB.mpcLock, false, "mpc_lock should be released after User B");

    console.log("    User B PASSED: sentiment=2 (Even), total_bets=3");

    // ---- User C: bet 5 USDC on No (third unique keypair) to reach Leaning No ----
    const privateKeyC = x25519.utils.randomPrivateKey();
    const publicKeyC = x25519.getPublicKey(privateKeyC);
    const sharedSecretC = x25519.getSharedSecret(privateKeyC, mxePublicKey);
    const cipherC = new RescueCipher(sharedSecretC);

    const nonceC = randomBytes(16);
    const isYesCtC = cipherC.encrypt([BigInt(0)], nonceC); // is_yes = false (No bet)
    const amountCtC = cipherC.encrypt([BigInt(5_000_000)], nonceC); // 5 USDC
    const offsetC = new anchor.BN(randomBytes(8), "hex");

    const accountsC = getArciumAccounts(
      program.programId,
      arciumCtx,
      offsetC,
      "update_pool"
    );

    await program.methods
      .updatePool(
        offsetC,
        Array.from(isYesCtC[0]) as unknown as number[],
        Array.from(amountCtC[0]) as unknown as number[],
        Array.from(publicKeyC) as unknown as number[],
        new anchor.BN(deserializeLE(nonceC).toString())
      )
      .accountsPartial({
        payer: payer.publicKey,
        market: marketPda,
        marketPool: marketPoolPda,
        mxeAccount: accountsC.mxeAccount,
        signPdaAccount: accountsC.signPdaAccount,
        mempoolAccount: accountsC.mempoolAccount,
        executingPool: accountsC.executingPool,
        computationAccount: accountsC.computationAccount,
        compDefAccount: accountsC.compDefAccount,
        clusterAccount: accountsC.clusterAccount,
        poolAccount: accountsC.poolAccount,
        clockAccount: accountsC.clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: accountsC.arciumProgram,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("    User C (No 5 USDC) queued, awaiting MPC...");

    await awaitAndVerifyCallback(provider, offsetC, program.programId);

    // After User C: Yes=8, No=13 -> Leaning No (3)
    const marketC = await program.account.market.fetch(marketPda);
    assert.equal(
      marketC.sentiment,
      3,
      "sentiment should be 3 (Leaning No) after User C: Yes=8, No=13"
    );
    assert.equal(marketC.totalBets.toNumber(), 4, "total_bets should be 4");
    assert.equal(marketC.mpcLock, false, "mpc_lock should be released after User C");

    console.log("    User C PASSED: sentiment=3 (Leaning No), total_bets=4");
    console.log("    Multi-keypair test PASSED:");
    console.log("      3 unique keypairs with independent shared secrets");
    console.log("      Sentiment transitions: Leaning Yes -> Even -> Leaning No");
    console.log("      All 3 sentiment states exercised via different user keypairs");
  });
});
