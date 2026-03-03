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
import { randomBytes } from "crypto";

// ============================================================================
// Configuration
// ============================================================================

/** Number of sequential update_pool calls to benchmark */
const NUM_RUNS = 10;

/** Target end-to-end latency in milliseconds (from CONTEXT.md) */
const TARGET_LATENCY_MS = 5_000;

// ============================================================================
// Types
// ============================================================================

interface BenchmarkResult {
  run: number;
  encryptMs: number;
  submitMs: number;
  mpcMs: number;
  totalMs: number;
}

interface BenchmarkStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
}

// ============================================================================
// Statistics Helpers
// ============================================================================

function calculateStats(values: number[]): BenchmarkStats {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  const p95Index = Math.ceil(sorted.length * 0.95) - 1;
  const p95 = sorted[Math.min(p95Index, sorted.length - 1)];

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    p95: Math.round(p95 * 100) / 100,
  };
}

function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

// ============================================================================
// Benchmark
// ============================================================================

describe("benchmark: MPC latency for update_pool on devnet/localnet", () => {
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

  // Market state
  let marketPda: PublicKey;
  let marketPoolPda: PublicKey;

  // Benchmark results
  const results: BenchmarkResult[] = [];

  before(async () => {
    console.log("\n  ============================================");
    console.log("  MPC Latency Benchmark");
    console.log("  ============================================");
    console.log(`  Cluster: ${provider.connection.rpcEndpoint}`);
    console.log(`  Runs: ${NUM_RUNS} sequential update_pool calls`);
    console.log(`  Target: < ${TARGET_LATENCY_MS}ms end-to-end`);
    console.log("  ============================================\n");

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

    // 6. Initialize comp_defs
    await initCompDef(program, payer, "init_pool", arciumCtx);
    await initCompDef(program, payer, "update_pool", arciumCtx);

    // 7. Create market and initialize pool
    const marketResult = await createTestMarket(
      program,
      admin,
      creator,
      usdcMint,
      configPda,
      1,
      { question: "Benchmark market for MPC latency measurement" }
    );
    marketPda = marketResult.marketPda;
    marketPoolPda = marketResult.marketPoolPda;

    // 8. Initialize encrypted pool state via init_pool
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

    console.log("  Setup complete: market created, pool initialized\n");
  });

  // ==========================================================================
  // Benchmark: N sequential update_pool calls
  // ==========================================================================
  it(`runs ${NUM_RUNS} sequential update_pool calls and measures latency`, async () => {
    for (let i = 0; i < NUM_RUNS; i++) {
      const isYes = i % 2 === 0; // Alternate Yes/No
      const amount = 1_000_000; // 1 USDC

      // Phase A: Client-side encryption
      const startEncrypt = performance.now();
      const bet = encryptBetInput(arciumCtx.mxePublicKey, isYes, amount);
      const encryptTime = performance.now() - startEncrypt;

      const arciumAccounts = getArciumAccounts(
        program.programId,
        arciumCtx,
        bet.computationOffset,
        "update_pool"
      );

      // Phase B: Transaction submission
      const startSubmit = performance.now();
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
      const submitTime = performance.now() - startSubmit;

      // Phase C: MPC computation (await callback finalization)
      const startMpc = performance.now();
      await awaitAndVerifyCallback(
        provider,
        bet.computationOffset,
        program.programId
      );
      const mpcTime = performance.now() - startMpc;

      const totalMs = encryptTime + submitTime + mpcTime;

      results.push({
        run: i + 1,
        encryptMs: Math.round(encryptTime * 100) / 100,
        submitMs: Math.round(submitTime * 100) / 100,
        mpcMs: Math.round(mpcTime * 100) / 100,
        totalMs: Math.round(totalMs * 100) / 100,
      });

      const side = isYes ? "Yes" : "No";
      const meetsTarget = totalMs < TARGET_LATENCY_MS ? "PASS" : "OVER";
      console.log(
        `    Run ${i + 1}/${NUM_RUNS}: ${side} 1 USDC | ` +
          `encrypt=${formatMs(encryptTime)} submit=${formatMs(submitTime)} ` +
          `mpc=${formatMs(mpcTime)} total=${formatMs(totalMs)} [${meetsTarget}]`
      );

      // mpc_lock is already released by the callback -- next iteration can proceed
    }

    // Print results summary
    console.log("\n  ============================================");
    console.log("  RESULTS SUMMARY");
    console.log("  ============================================\n");

    // Per-run table
    console.log(
      "  | Run | Side | Encrypt | Submit  | MPC     | Total   | Target |"
    );
    console.log(
      "  |-----|------|---------|---------|---------|---------|--------|"
    );
    for (const r of results) {
      const side = r.run % 2 === 1 ? "Yes" : "No"; // run 1 = i=0 = Yes
      const target = r.totalMs < TARGET_LATENCY_MS ? "PASS" : "OVER";
      console.log(
        `  | ${String(r.run).padStart(3)} | ${side.padEnd(4)} | ` +
          `${formatMs(r.encryptMs).padStart(7)} | ` +
          `${formatMs(r.submitMs).padStart(7)} | ` +
          `${formatMs(r.mpcMs).padStart(7)} | ` +
          `${formatMs(r.totalMs).padStart(7)} | ` +
          `${target.padStart(6)} |`
      );
    }

    // Statistics
    const encryptStats = calculateStats(results.map((r) => r.encryptMs));
    const submitStats = calculateStats(results.map((r) => r.submitMs));
    const mpcStats = calculateStats(results.map((r) => r.mpcMs));
    const totalStats = calculateStats(results.map((r) => r.totalMs));

    console.log("\n  Per-Phase Statistics (ms):");
    console.log(
      "  | Phase     | Min     | Max     | Mean    | Median  | P95     |"
    );
    console.log(
      "  |-----------|---------|---------|---------|---------|---------|"
    );

    for (const [name, stats] of [
      ["Encrypt", encryptStats],
      ["Submit", submitStats],
      ["MPC", mpcStats],
      ["Total", totalStats],
    ] as [string, BenchmarkStats][]) {
      console.log(
        `  | ${name.padEnd(9)} | ` +
          `${formatMs(stats.min).padStart(7)} | ` +
          `${formatMs(stats.max).padStart(7)} | ` +
          `${formatMs(stats.mean).padStart(7)} | ` +
          `${formatMs(stats.median).padStart(7)} | ` +
          `${formatMs(stats.p95).padStart(7)} |`
      );
    }

    // Viability assessment
    const passCount = results.filter(
      (r) => r.totalMs < TARGET_LATENCY_MS
    ).length;
    const passRate = ((passCount / results.length) * 100).toFixed(0);

    console.log("\n  ============================================");
    console.log("  VIABILITY ASSESSMENT");
    console.log("  ============================================");
    console.log(
      `  Target: < ${TARGET_LATENCY_MS}ms end-to-end per update_pool`
    );
    console.log(`  Mean total: ${formatMs(totalStats.mean)}`);
    console.log(`  Median total: ${formatMs(totalStats.median)}`);
    console.log(`  P95 total: ${formatMs(totalStats.p95)}`);
    console.log(`  Pass rate: ${passRate}% (${passCount}/${results.length})`);

    if (totalStats.median < TARGET_LATENCY_MS) {
      console.log("  Assessment: PASS -- sequential lock is viable for v1 UX");
    } else if (totalStats.median < TARGET_LATENCY_MS * 2) {
      console.log(
        "  Assessment: CONDITIONAL -- latency exceeds target but may be acceptable for v1"
      );
      console.log(
        "  Recommendation: Accept for v1, document SCAL-01 (batched epoch model) for v2"
      );
    } else {
      console.log(
        "  Assessment: FAIL -- latency significantly exceeds target"
      );
      console.log(
        "  Recommendation: Prioritize SCAL-01 (batched epoch model) for v2"
      );
    }
    console.log("  ============================================\n");

    // Output JSON for programmatic consumption
    const benchmarkOutput = {
      cluster: provider.connection.rpcEndpoint,
      circuit: "update_pool",
      numRuns: NUM_RUNS,
      targetMs: TARGET_LATENCY_MS,
      date: new Date().toISOString(),
      results,
      stats: {
        encrypt: encryptStats,
        submit: submitStats,
        mpc: mpcStats,
        total: totalStats,
      },
      passRate: `${passRate}%`,
    };

    console.log("  Benchmark JSON output:");
    console.log(JSON.stringify(benchmarkOutput, null, 2));
  });
});
