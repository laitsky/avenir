# Arcium MPC Latency Benchmark

**Date:** 2026-03-03
**Environment:** Arcium devnet (cluster offset 456) -- PLACEHOLDER: not yet measured
**Circuit:** update_pool (pool accumulation + sentiment bucket computation)
**Methodology:** N=10 sequential update_pool calls, each measuring encrypt + submit + MPC phases
**ACU Cost:** 558,000,000 ACUs (from `arcium build` output)

> **IMPORTANT: PLACEHOLDER DATA**
>
> The latency numbers in this document are **estimates, not measurements**. Actual benchmark
> execution was blocked by infrastructure constraints (see [Blockers](#blockers) section below).
> The benchmark script (`tests/mpc/benchmark.ts`) is ready to run when the infrastructure
> issues are resolved. All numbers below should be replaced with actual measurements before
> RTG submission (Phase 10).

## Estimated Results

### Per-Phase Latency (milliseconds) -- ESTIMATED

| Phase | Min | Max | Mean | Median | P95 |
|-------|-----|-----|------|--------|-----|
| Encryption (client) | ~1 | ~5 | ~2 | ~2 | ~4 |
| Submission (tx confirm) | ~400 | ~800 | ~550 | ~500 | ~750 |
| MPC Computation | ~2,000 | ~8,000 | ~4,000 | ~3,500 | ~7,000 |
| **Total (end-to-end)** | **~2,400** | **~8,800** | **~4,550** | **~4,000** | **~7,750** |

### Estimation Basis

These estimates are derived from:

1. **Encryption (client):** x25519 key exchange + RescueCipher is a local CPU operation. Based on
   observed performance in unit tests, client-side encryption completes in <5ms. This phase is
   negligible relative to network operations.

2. **Submission (tx confirm):** Solana devnet transaction confirmation typically takes 400-800ms
   with `commitment: "confirmed"`. This is well-documented Solana network behavior.

3. **MPC Computation:** Arcium's documentation claims 5-100 computations/second for their network.
   The update_pool circuit at 558M ACUs includes 2 comparisons (expensive in MPC due to bit
   decomposition), 2 multiplications, 2 additions, and 1 conditional. This is moderate complexity.
   Estimated range: 2-8 seconds, with high variance expected on devnet due to node availability
   and network conditions.

4. **Total:** Sum of phases. The MPC computation phase dominates end-to-end latency.

### Estimated Individual Runs -- PLACEHOLDER

| Run | Encrypt | Submit | MPC | Total | Target |
|-----|---------|--------|-----|-------|--------|
| 1 | ~3ms | ~600ms | ~5,000ms | ~5,603ms | OVER |
| 2 | ~2ms | ~500ms | ~3,200ms | ~3,702ms | PASS |
| 3 | ~2ms | ~450ms | ~3,500ms | ~3,952ms | PASS |
| 4 | ~1ms | ~550ms | ~4,100ms | ~4,651ms | PASS |
| 5 | ~2ms | ~500ms | ~3,000ms | ~3,502ms | PASS |
| 6 | ~2ms | ~700ms | ~3,800ms | ~4,502ms | PASS |
| 7 | ~3ms | ~480ms | ~4,500ms | ~4,983ms | PASS |
| 8 | ~1ms | ~520ms | ~7,200ms | ~7,721ms | OVER |
| 9 | ~2ms | ~550ms | ~3,400ms | ~3,952ms | PASS |
| 10 | ~2ms | ~600ms | ~2,800ms | ~3,402ms | PASS |

*All values are estimates. Run 1 and 8 show expected cold-start and outlier variance.*

## Viability Assessment

### Target: < 5 seconds end-to-end

**Assessment: CONDITIONAL (estimated, pending actual measurement)**

Based on estimated latency:

- **Estimated mean total:** ~4,550ms (under 5s target)
- **Estimated median total:** ~4,000ms (under 5s target)
- **Estimated P95 total:** ~7,750ms (over 5s target)
- **Estimated pass rate:** ~80% (8/10 under target)

**Interpretation (subject to validation):**

The sequential lock approach is likely viable for v1 UX, with most bet placements completing
under the 5-second target. However, tail latency (P95) may exceed the target significantly,
meaning some users will experience 7-8 second waits. Per CONTEXT.md decision:

- **Accepted for v1:** The encrypted privacy guarantee justifies the wait. Users bet their
  genuine belief without seeing pool direction -- this is the core product value.
- **Optimization opportunities for v2:**
  - Circuit simplification: remove sentiment computation from update_pool (compute lazily)
  - Batch submissions: SCAL-01 (batched epoch model) collects bets in time windows
  - Parallel MPC: if Arcium supports concurrent computations per circuit
  - Network improvements: Arcium mainnet may have better latency than devnet

### Observations (Expected)

- **MPC computation dominates:** Estimated ~88% of total latency is MPC processing time.
  Client encryption is negligible (<0.1%). Solana transaction submission is ~12%.
- **Cold start effect:** First MPC call after circuit deployment may take longer as nodes
  load the circuit definition. Subsequent calls should be faster (warm cache).
- **Variance is high on devnet:** Arcium devnet node availability and load vary significantly.
  Production (mainnet) latency may differ substantially.
- **Comparison operations are expensive:** The 2 comparison operations in the sentiment bucket
  logic (is total_yes > total_no, is total_yes == total_no) require bit decomposition in MPC,
  which is the most expensive primitive. Removing sentiment from update_pool and computing it
  lazily on-chain could reduce MPC time by ~30-40%.

## Circuit Complexity

- **Operations:** 1 conditional (is_yes), 2 additions, 2 multiplications, 2 comparisons (sentiment)
- **ACU cost:** 558,000,000 ACUs (from `arcium build` output)
- **Comparison operations** are the most expensive (bit decomposition in MPC). The sentiment
  bucket logic adds 2 comparisons that could be deferred to a cheaper on-chain computation
  if latency optimization is needed.
- **Input types:** `Enc<Shared, BetInput>` (user bet), `Enc<Mxe, PoolTotals>` (on-chain state)
- **Output types:** `(Enc<Mxe, PoolTotals>, u8)` (updated state + plaintext sentiment)

## Blockers

The benchmark script (`tests/mpc/benchmark.ts`) could not be executed due to:

1. **Docker ARM64 incompatibility:** The Arcium ARX node Docker image is only available for
   x86_64 architecture. On Apple Silicon (M-series), it runs under Rosetta emulation which
   causes reliability issues with the `arcium test` local test infrastructure.

2. **arcium-cli startup timeout:** The `arcium test` command has a hardcoded validator startup
   timeout that does not respect the `startup_wait` configuration in `Anchor.toml`. The
   solana-test-validator works standalone but fails to initialize within the CLI's timeout
   window when loading genesis accounts through `arcium test`.

3. **No devnet deployment yet:** Devnet deployment requires SOL for fees and a working
   `arcium deploy --cluster devnet` command. The program builds successfully but has not
   been deployed to devnet.

### Resolution Path

1. **Short-term:** Wait for Arcium to release ARM64-native Docker images, or
   use an x86_64 CI runner (GitHub Actions) to execute the benchmark
2. **Medium-term:** File issue with Arcium team about `arcium test` startup timeout
   not respecting `Anchor.toml` settings
3. **Phase 10 (RTG):** Before RTG submission, execute benchmark on devnet and replace
   all placeholder values with actual measurements

## Implications for Future Phases

- **Phase 5 (Encrypted Betting):** Sequential lock UX design should assume 3-5s average
  latency for update_pool. UI should show a progress indicator during MPC computation.
  If actual latency exceeds 5s consistently, consider SCAL-01 batched epoch model.

- **Phase 6 (Resolution):** compute_payouts circuit is simpler than update_pool (no
  comparisons needed -- just division and multiplication for payout calculation). Expected
  to be faster. However, compute_payouts processes all participants, so circuit complexity
  scales with pool size.

- **Phase 8 (Disputes):** add_dispute_vote has similar complexity to update_pool (encrypted
  accumulation with conditional logic). Expect similar latency. finalize_dispute is a
  one-time batch operation, latency less critical.

- **SCAL-01 (Batched Epoch Model):** If actual measured latency exceeds 5s target
  consistently, the batched epoch model becomes a critical v2 requirement. Instead of
  sequential per-bet MPC calls, bets are collected in time windows (e.g., 30-second epochs)
  and processed in a single MPC batch. This amortizes MPC overhead across multiple bets.

---

*Document Status: PLACEHOLDER -- pending actual benchmark execution*
*Benchmark Script: tests/mpc/benchmark.ts (ready to run)*
*Last Updated: 2026-03-03*
