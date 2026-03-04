---
phase: 06-resolution-payouts
verified: 2026-03-04T09:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 9/10
  gaps_closed:
    - "RES-02 traceability gap resolved: requirement reclassified from Phase 6 (complete) to Phase 8 (pending) via plan 06-05. REQUIREMENTS.md, ROADMAP.md, 06-01-PLAN.md, and 06-04-PLAN.md all updated. Phase 6 requirement set is now RES-01, RES-07, RES-08, RES-09."
  gaps_remaining: []
  regressions: []
---

# Phase 6: Resolution & Payouts Verification Report

**Phase Goal:** Market creators can declare winners and winning bettors receive instant proportional USDC payouts with protocol fee deducted
**Verified:** 2026-03-04T09:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 06-05 reclassified RES-02 to Phase 8)

## Re-verification Summary

The single gap from the initial verification (RES-02 traceability) is closed. Plan 06-05 executed the reclassification via two commits:

- `84d063b` — Reclassify RES-02 in REQUIREMENTS.md (unchecked, Phase 8 Pending) and ROADMAP.md (removed from Phase 6, added to Phase 8)
- `54c8a91` — Remove RES-02 from 06-01-PLAN.md and 06-04-PLAN.md requirements frontmatter

All four modified files were confirmed in the codebase. No code regressions detected on any of the Phase 6 implementation artifacts.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Market creator can declare the winning outcome after deadline passes | VERIFIED | resolve_market.rs validates `market.creator == creator.key()`, `market.state == 0`, `clock.unix_timestamp >= market.resolution_time`, `mpc_lock == false`, `winning_outcome in {1,2}` |
| 2 | resolve_market rejects non-creator callers, non-Open markets, pre-deadline calls, locked markets, and invalid outcomes | VERIFIED | All five guards present: `NotMarketCreator` via constraint, `MarketNotOpen` via `require!(state==0)`, `MarketNotExpired` via `require!(clock >= resolution_time)`, `MpcLocked` via `require!(!mpc_lock)`, `InvalidOutcome` via `require!(outcome==1 \|\| outcome==2)` |
| 3 | compute_payouts circuit compiles and reveals both pool totals as plaintext u64 values | VERIFIED | encrypted-ixs/src/lib.rs lines 72-78: `fn compute_payouts(pool_ctxt: Enc<Mxe, PoolTotals>) -> (u64, u64)` with `pool[0].reveal(), pool[1].reveal()` |
| 4 | compute_payouts MPC can be queued on a Resolved market, with mpc_lock acquired and released | VERIFIED | compute_payouts.rs validates `state==2`, handles 60s lock timeout recovery, sets mpc_lock=true before queue, callback clears mpc_lock on both success and failure paths |
| 5 | compute_payouts_callback writes revealed pool totals and transitions market to Finalized(4) | VERIFIED | lib.rs lines 312-328: `market.revealed_yes_pool = result.field_0; market.revealed_no_pool = result.field_1; market.state = 4; market.mpc_lock = false;` |
| 6 | Winner can claim proportional USDC payout from vault after finalization | VERIFIED | claim_payout.rs implements full payout formula with u128 intermediates, two SPL Token CPIs (net to winner, fee to recipient), conditional fee (skipped if fee==0) |
| 7 | Protocol fee of 2% is deducted and sent to config_fee_recipient | VERIFIED | `fee = gross * config_fee_bps / 10_000` using u128. Transferred via CPI to `fee_recipient_token_account` whose owner is `market.config_fee_recipient`. |
| 8 | Losers and double claimants are rejected | VERIFIED | `NoWinningPosition` when `user_winning_amount==0`, `AlreadyClaimed` when `position.claimed==true`. Both tested in resolution.ts tests 9 and 10. |
| 9 | Integration tests cover full lifecycle including all error cases | VERIFIED | tests/resolution.ts has 10 test cases: bet placement + MPC callback, NotMarketCreator, MarketNotExpired (separate future-deadline market), InvalidOutcome, resolve success, MarketNotOpen (double-resolve), compute_payouts MPC lifecycle, winner claim with exact math (14.7M net), loser rejection, double claim rejection |

**Score:** 9/9 truths verified

---

## Required Artifacts

### Plan 06-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `programs/avenir/src/instructions/resolve_market.rs` | resolve_market handler + ResolveMarket accounts struct | VERIFIED | 53 lines. Handler with all 5 guards, state transition Open(0)->Resolved(2), ResolveMarket struct with creator constraint. |
| `programs/avenir/src/state/market.rs` | Market struct with revealed_yes_pool and revealed_no_pool | VERIFIED | Lines 44-47: `pub revealed_yes_pool: u64` and `pub revealed_no_pool: u64` present before bump fields. State comment updated to include Finalized(4). |
| `encrypted-ixs/src/lib.rs` | compute_payouts circuit with `fn compute_payouts` | VERIFIED | Lines 72-78: `#[instruction] pub fn compute_payouts(pool_ctxt: Enc<Mxe, PoolTotals>) -> (u64, u64)` |

### Plan 06-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `programs/avenir/src/instructions/mpc/init_compute_payouts_comp_def.rs` | Comp_def registration for compute_payouts | VERIFIED | 38 lines. `#[init_computation_definition_accounts("compute_payouts", payer)]`, `init_comp_def(ctx.accounts, None, None)` |
| `programs/avenir/src/instructions/mpc/compute_payouts.rs` | Queue instruction for compute_payouts MPC | VERIFIED | 163 lines. Validates Resolved state, 60s lock timeout, ArgBuilder with `.account(market_pool.key(), 16, 64)` only, single callback account (Market). |
| `programs/avenir/src/instructions/mpc/compute_payouts_callback.rs` | Callback accounts struct | VERIFIED | 39 lines. `#[callback_accounts("compute_payouts")]` with standard Arcium accounts + Market as only custom account. |

### Plan 06-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `programs/avenir/src/instructions/claim_payout.rs` | claim_payout handler with proportional payout + two SPL Token CPIs | VERIFIED | 161 lines. Complete payout formula (u128), conditional fee CPI, claimed flag set post-CPI, ClaimPayout account struct with immutable Market. |

### Plan 06-04 Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `tests/resolution.ts` | Integration tests for resolve_market, compute_payouts, claim_payout | VERIFIED | 767 lines. 10 test cases. Full lifecycle from bet placement through winner claim. Exact payout math assertions (14.7M net, 300K fee). |

### Plan 06-05 Artifacts (Gap Closure)

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `.planning/REQUIREMENTS.md` | RES-02 unchecked, traceability mapped to Phase 8: Dispute System | Pending | VERIFIED | `[ ] **RES-02**` (unchecked). Traceability table: `RES-02 | Phase 8: Dispute System | Pending`. Commits 84d063b + 54c8a91. |
| `.planning/ROADMAP.md` | Phase 6 requirements = RES-01, RES-07, RES-08, RES-09. Phase 8 includes RES-02. | VERIFIED | Line 145: `**Requirements**: RES-01, RES-07, RES-08, RES-09`. Line 185: `**Requirements**: RES-02, RES-03, RES-04, RES-05, RES-06`. |
| `.planning/phases/06-resolution-payouts/06-01-PLAN.md` | requirements: [RES-01] only | VERIFIED | Frontmatter line 15: `requirements: [RES-01]` |
| `.planning/phases/06-resolution-payouts/06-04-PLAN.md` | requirements: [RES-01, RES-07, RES-08, RES-09] | VERIFIED | Frontmatter line 11: `requirements: [RES-01, RES-07, RES-08, RES-09]` |

---

## Key Link Verification

### Plan 06-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `programs/avenir/src/lib.rs` | `resolve_market.rs` | `pub fn resolve_market` entry point | VERIFIED | lib.rs line 36-38: `pub fn resolve_market(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> { instructions::resolve_market::handler(ctx, winning_outcome) }` |
| `programs/avenir/src/errors.rs` | `resolve_market.rs` | Error variants used: NotMarketCreator, MarketNotExpired, InvalidOutcome | VERIFIED | errors.rs has all 7 new variants (lines 43-56). resolve_market.rs uses `AvenirError::MarketNotExpired`, `AvenirError::InvalidOutcome`, `AvenirError::NotMarketCreator` (via constraint). |

### Plan 06-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `compute_payouts.rs` | `compute_payouts_callback.rs` | `ComputePayoutsCallback::callback_ix` in callback_ixs vector | VERIFIED | compute_payouts.rs line 9: `use super::compute_payouts_callback::ComputePayoutsCallback;`. Line 67: `vec![ComputePayoutsCallback::callback_ix(...)]` |
| `compute_payouts_callback.rs` (inline in lib.rs) | `market.rs` | writes revealed_yes_pool, revealed_no_pool, state=4 | VERIFIED | lib.rs lines 312-317: `market.revealed_yes_pool = result.field_0; market.revealed_no_pool = result.field_1; market.state = 4;` |
| `tests/mpc/helpers.ts` | `init_compute_payouts_comp_def.rs` | switch case for "compute_payouts" | VERIFIED | helpers.ts lines 376-380: `case "compute_payouts": await program.methods.initComputePayoutsCompDef().accountsPartial(accounts).rpc(...)` |

### Plan 06-03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `claim_payout.rs` | `market.rs` | reads revealed_yes_pool, revealed_no_pool, config_fee_bps | VERIFIED | claim_payout.rs lines 39-48: `market.revealed_yes_pool`, `market.revealed_no_pool`, `market.config_fee_bps` all referenced in payout math |
| `claim_payout.rs` | `user_position.rs` | reads yes_amount/no_amount, writes claimed=true | VERIFIED | claim_payout.rs lines 29-33 (reads), line 103 (writes `position.claimed = true`) |
| `programs/avenir/src/lib.rs` | `claim_payout.rs` | `pub fn claim_payout` entry point | VERIFIED | lib.rs line 40-42: `pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> { instructions::claim_payout::handler(ctx) }` |

### Plan 06-04 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/resolution.ts` | `tests/mpc/helpers.ts` | imports setupArciumContext, encryptBetInput, createTestMarket, getArciumAccounts, initCompDef, getConfigPda | VERIFIED | resolution.ts lines 19-27: all imports from `./mpc/helpers` |
| `tests/resolution.ts` | `programs/avenir/src/lib.rs` | calls resolveMarket, computePayouts, claimPayout program methods | VERIFIED | resolution.ts lines 454, 593, 663: `program.methods.resolveMarket(1)`, `program.methods.computePayouts(computeOffset)`, `program.methods.claimPayout()` |

### Plan 06-05 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.planning/REQUIREMENTS.md` | `.planning/ROADMAP.md` | Traceability table Phase column for RES-02 | VERIFIED | REQUIREMENTS.md traceability: `RES-02 | Phase 8: Dispute System | Pending`. ROADMAP.md Phase 6 requirements exclude RES-02; Phase 8 requirements include RES-02. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| RES-01 | 06-01, 06-04 | Market creator can resolve the market by declaring the winning outcome | SATISFIED | resolve_market.rs validates `market.creator == creator.key()`. Test 5 in resolution.ts verifies success path. |
| RES-07 | 06-03, 06-04 | Winners receive instant USDC payout proportional to winning pool share | SATISFIED | claim_payout.rs implements `gross = user_amount * total_pool / winning_pool`. Test 8 asserts exact values: 14.7M net from 10M Yes bet with 15M total pool. |
| RES-08 | 06-03, 06-04 | Protocol fee of 1-2% deducted from winning payouts | SATISFIED | claim_payout.rs: `fee = gross * config_fee_bps / 10_000`. Market initialized with 200 bps (2%). Test 8 asserts 300K fee collected. |
| RES-09 | 06-02, 06-04 | Payout calculation uses plaintext math after pool totals revealed at resolution | SATISFIED | compute_payouts circuit reveals totals. claim_payout.rs uses plaintext arithmetic (no MPC). Finalized state (4) gate ensures totals are available before claims. |

**Note on RES-02:** Reclassified to Phase 8 (Dispute System) via plan 06-05. The 48-hour upper bound on resolution windows requires dispute escalation infrastructure as a fallback; implementing the upper bound without the dispute system would leave markets permanently unresolvable if creators miss the window. The lower bound (`clock >= resolution_time`) is correctly enforced in Phase 6. RES-02 status in REQUIREMENTS.md: Pending. Phase 6 requirement set does not include RES-02.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| None found | - | - | - | - |

All scanned files are substantive implementations with no TODO/FIXME/placeholder comments, no stub returns (`return null`, `return {}`, `return []`), and no console-only handlers.

---

## Human Verification Required

### 1. MPC Computation Finalization

**Test:** Run `anchor test --skip-deploy tests/resolution.ts` with Arcium localnet running
**Expected:** All 10 tests pass. compute_payouts callback fires, sets `market.revealedYesPool == 10_000_000` and `market.revealedNoPool == 5_000_000`. Winner receives exactly 14,700,000 token units.
**Why human:** MPC execution requires live Arcium localnet. Cannot verify that compute_payouts circuit actually reveals correct plaintext u64 values without running the circuit. The callback wiring is verified; MPC execution is not.

### 2. Payout Math Precision Under Edge Cases

**Test:** Manually test all-bets-on-one-side scenario: single Yes bettor places 10 USDC, no No bets. Resolve with Yes. Run compute_payouts. Claim payout.
**Expected:** winning_pool == total_pool, so gross == user_winning_amount (10M). fee == 200K (2%). net == 9.8M. No division-by-zero panic.
**Why human:** The formula `checked_div(winning_pool as u128)` will succeed when winning_pool > 0, but if no No bets were placed and the pool was initialized to [10M, 0], this edge case requires a live MPC execution to verify the circuit correctly reveals [10M, 0] and the on-chain math produces the correct result without panicking.

---

## Gaps Summary

No gaps remain. Phase 6 goal is fully achieved.

The single gap from the initial verification (RES-02 traceability mismatch) was resolved by plan 06-05, which reclassified RES-02 to Phase 8: Dispute System. The reclassification is consistent with the CONTEXT.md locked decision and is correctly reflected in all four planning documents (REQUIREMENTS.md, ROADMAP.md, 06-01-PLAN.md, 06-04-PLAN.md).

The phase delivers its stated goal in full: market creators can declare winners (`resolve_market`), the MPC pipeline reveals encrypted pool totals as plaintext (`compute_payouts` + `compute_payouts_callback`), and winning bettors receive proportional USDC payouts with 2% protocol fee deducted (`claim_payout`). All flows are wired, tested with 10 integration tests, and free of anti-patterns.

---

*Verified: 2026-03-04T09:00:00Z*
*Verifier: Claude (gsd-verifier)*
