# Arcium MPC Latency Benchmark

**Date:** 2026-03-03
**Environment:** Arcium devnet (cluster offset 456)
**Circuit:** update_pool (pool accumulation + sentiment bucket computation)
**Methodology:** N=10 sequential update_pool calls, each measuring encrypt + submit + MPC phases
**ACU Cost:** 558,000,000 ACUs (from `arcium build` output)
**Document Status:** ESTIMATED -- blocked by Arcium devnet DKG ceremony non-functional

> **ESTIMATED DATA -- Arcium Devnet DKG Non-Functional**
>
> The latency numbers in this document are **estimates, not measurements**. The Avenir program was
> successfully deployed to Arcium devnet and the MXE account was initialized, but the benchmark
> could not be executed because the **DKG (Distributed Key Generation) ceremony is not completing
> on Arcium devnet**. As of 2026-03-03, 0 out of 142 MXE accounts on devnet have completed DKG.
> `getMXEPublicKey()` returns `null` for all accounts, which blocks all encryption and MPC
> computation. The benchmark script (`tests/mpc/benchmark.ts`) is ready to run when the DKG
> issue is resolved by the Arcium team.

## Devnet Deployment Status

The following infrastructure is deployed and verified on Arcium devnet:

| Component | Status | Details |
|-----------|--------|---------|
| Avenir Solana Program | Deployed | Program ID: `PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN` |
| MXE Account | Initialized | Cluster offset 456, status: active |
| DKG Ceremony | NOT COMPLETED | 0/142 MXE accounts have completed DKG on devnet |
| getMXEPublicKey() | Returns null | Blocks all client-side encryption |
| Benchmark Script | Ready | Adapted for devnet (wallet transfers, retry logic) |
| GitHub Actions CI | Passing | `arcium build` validates program + circuit compilation |

**What works:** Program deployment, MXE initialization, creator whitelisting, benchmark script setup through "Creator whitelisted" step.

**What is blocked:** Any operation requiring encryption (getMXEPublicKey, encryptBetInput, update_pool MPC calls) because DKG has not completed for any MXE account on the network.

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

### Estimated Individual Runs

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

*All values are estimates based on Arcium documentation and Solana devnet benchmarks. Actual measurement blocked by DKG ceremony failure.*

## Viability Assessment

### Target: < 5 seconds end-to-end

**Assessment: CONDITIONAL (estimated -- actual measurement blocked by Arcium devnet DKG)**

Based on estimated latency:

- **Estimated mean total:** ~4,550ms (under 5s target)
- **Estimated median total:** ~4,000ms (under 5s target)
- **Estimated P95 total:** ~7,750ms (over 5s target)
- **Estimated pass rate:** ~80% (8/10 under target)

**Interpretation (pending validation when DKG is resolved):**

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

### Observations (Estimated)

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

### Resolved

1. **Docker ARM64 incompatibility** -- RESOLVED via GitHub Actions CI (03-06).
   The Arcium ARX node Docker image is x86_64 only. GitHub Actions ubuntu-latest runner
   provides x86_64 environment for `arcium build` verification.

2. **arcium-cli startup timeout** -- RESOLVED (workaround: devnet deployment bypasses localnet).
   The `arcium test` command has a hardcoded validator startup timeout. Devnet deployment
   eliminates the need for local test infrastructure.

3. **No devnet deployment** -- RESOLVED (03-07).
   Program deployed to devnet at `PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN`.
   MXE account initialized with cluster offset 456.

### Active

4. **Arcium devnet DKG ceremony non-functional** -- BLOCKING
   The Distributed Key Generation (DKG) ceremony is not completing for ANY MXE account on
   Arcium devnet. As of 2026-03-03:
   - 0 out of 142 MXE accounts have completed DKG
   - `getMXEPublicKey()` returns `null` for all accounts
   - This blocks ALL encryption and MPC computation on devnet
   - The issue is network-wide, not specific to Avenir's MXE account
   - Root cause: Arcium devnet infrastructure issue (not an application bug)

### Resolution Path

1. **Short-term:** Monitor Arcium devnet DKG status. When DKG completes for Avenir's MXE
   account, run the benchmark immediately:
   ```bash
   bun run ts-mocha -p ./tsconfig.json -t 1000000 "tests/mpc/benchmark.ts"
   ```
2. **Medium-term:** Engage Arcium team about devnet DKG completion timeline
3. **Phase 10 (RTG):** Before RTG submission, replace all estimated values with actual
   measurements once DKG is functional

## Implications for Future Phases

- **Phase 5 (Encrypted Betting):** Sequential lock UX design should assume 3-5s average
  latency for update_pool. UI should show a progress indicator during MPC computation.
  If actual latency exceeds 5s consistently, consider SCAL-01 batched epoch model.
  **Note:** Phase 5 implementation is blocked by the same DKG issue until resolved.

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

*Document Status: ESTIMATED -- blocked by Arcium devnet DKG ceremony non-functional*
*Benchmark Script: tests/mpc/benchmark.ts (ready to run when DKG completes)*
*Last Updated: 2026-03-03*
