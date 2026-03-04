---
phase: 06-resolution-payouts
plan: 02
subsystem: on-chain
tags: [anchor, arcium, mpc, compute-payouts, callback, queue-computation, finalized-state]

# Dependency graph
requires:
  - phase: 06-resolution-payouts
    plan: 01
    provides: resolve_market instruction (Open->Resolved), compute_payouts circuit, Market.revealed_yes_pool/revealed_no_pool fields
provides:
  - init_compute_payouts_comp_def instruction (registers compute_payouts circuit definition)
  - compute_payouts queue instruction (validates Resolved state, handles lock timeout, queues MPC with account-only ArgBuilder)
  - compute_payouts_callback inline handler (writes revealed pool totals, transitions to Finalized state)
  - initCompDef test helper support for "compute_payouts" circuit
affects: [06-03-PLAN, 06-04-PLAN, phase-07-frontend, phase-08-disputes]

# Tech tracking
tech-stack:
  added: []
  patterns: [account-only ArgBuilder (no user-encrypted input), single custom callback account, revealed u64 output destructuring]

key-files:
  created:
    - programs/avenir/src/instructions/mpc/init_compute_payouts_comp_def.rs
    - programs/avenir/src/instructions/mpc/compute_payouts.rs
    - programs/avenir/src/instructions/mpc/compute_payouts_callback.rs
  modified:
    - programs/avenir/src/instructions/mpc/mod.rs
    - programs/avenir/src/lib.rs
    - tests/mpc/helpers.ts

key-decisions:
  - "ComputePayoutsOutput uses nested struct pattern: field_0.field_0 (u64) and field_0.field_1 (u64) for revealed yes/no pool"
  - "compute_payouts callback has only 1 custom account (Market) vs update_pool's 6 -- simpler since no refund or token operations needed"
  - "Lock timeout recovery clears lock+timestamp only (no pending_bettor/pending_amount/pending_is_yes since compute_payouts doesn't track pending bets)"

patterns-established:
  - "Account-only MPC queue: ArgBuilder.new().account() with no user-encrypted input for reveal-only operations"
  - "Minimal callback account set: Only include accounts the callback actually writes to"

requirements-completed: [RES-09]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 6 Plan 02: Compute Payouts MPC Infrastructure Summary

**compute_payouts MPC pipeline: comp_def registration, queue instruction with account-only ArgBuilder, and callback that writes revealed pool totals and transitions Market to Finalized(4)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T07:56:27Z
- **Completed:** 2026-03-04T08:01:28Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Complete compute_payouts MPC pipeline: comp_def registration, queue instruction, and callback handler
- Queue instruction validates Resolved state, handles 60s lock timeout, uses ArgBuilder with account-only read (no user-encrypted input)
- Callback writes revealed_yes_pool and revealed_no_pool to Market, transitions state to Finalized(4), clears mpc_lock on both success and failure
- Test helper initCompDef extended with "compute_payouts" case for integration testing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create init_compute_payouts_comp_def and compute_payouts queue instruction** - `5edd254` (feat)
2. **Task 2: Create compute_payouts_callback and wire all entry points** - `19b49c3` (feat)

## Files Created/Modified
- `programs/avenir/src/instructions/mpc/init_compute_payouts_comp_def.rs` - Computation definition registration for compute_payouts circuit (exact pattern from init_update_pool_comp_def)
- `programs/avenir/src/instructions/mpc/compute_payouts.rs` - Queue instruction: validates Resolved state, 60s lock timeout recovery, ArgBuilder with account-only read, single Market callback account
- `programs/avenir/src/instructions/mpc/compute_payouts_callback.rs` - Callback account struct with Market as only custom account (standard Arcium callback accounts + Market)
- `programs/avenir/src/instructions/mpc/mod.rs` - Added compute_payouts, compute_payouts_callback, init_compute_payouts_comp_def modules and re-exports
- `programs/avenir/src/lib.rs` - Added 3 entry points: init_compute_payouts_comp_def, compute_payouts, compute_payouts_callback (inline handler pattern)
- `tests/mpc/helpers.ts` - Added "compute_payouts" case to initCompDef switch statement

## Decisions Made
- ComputePayoutsOutput follows the nested struct pattern: `ComputePayoutsOutput { field_0: ComputePayoutsOutputStruct0 { field_0: u64, field_1: u64 } }` -- confirmed by inspecting generated IDL types after anchor build
- Only 1 custom callback account (Market) needed -- compute_payouts doesn't hold user funds (no refund path), doesn't update MarketPool (ciphertext already revealed), and doesn't touch UserPosition
- Lock timeout recovery simplified vs place_bet: no refund CPI, just clear lock + lock_timestamp fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created callback struct file in Task 1 scope**
- **Found during:** Task 1 (compute_payouts.rs imports ComputePayoutsCallback)
- **Issue:** compute_payouts.rs has `use super::compute_payouts_callback::ComputePayoutsCallback` which requires the callback struct to exist. cargo check cannot verify Task 1 without the callback file.
- **Fix:** Created the compute_payouts_callback.rs struct file during Task 1 (handler logic added in Task 2 as planned). Committed callback struct in Task 2 commit since it logically belongs there.
- **Files modified:** programs/avenir/src/instructions/mpc/compute_payouts_callback.rs
- **Verification:** anchor build succeeds with exit code 0
- **Committed in:** 19b49c3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Callback struct file creation order adjusted for compilation dependency. No scope creep.

## Issues Encountered
- Pre-existing SBF stack overflow warnings from place_bet function appear during anchor build -- these are out of scope (known from Plan 01)
- cargo check cannot verify partial MPC instruction sets -- callback struct must exist before queue instruction compiles due to `#[callback_accounts]` macro needing discriminator from `#[arcium_callback]` in lib.rs

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full compute_payouts MPC pipeline ready: comp_def -> queue -> callback
- Market transitions: Open(0) -> Resolved(2) -> Finalized(4) complete
- revealed_yes_pool and revealed_no_pool written to Market for Plan 03 (claim_payout) payout math
- Test helper supports all 4 circuit types: hello_world, init_pool, update_pool, compute_payouts

## Self-Check: PASSED

- FOUND: programs/avenir/src/instructions/mpc/init_compute_payouts_comp_def.rs
- FOUND: programs/avenir/src/instructions/mpc/compute_payouts.rs
- FOUND: programs/avenir/src/instructions/mpc/compute_payouts_callback.rs
- FOUND: .planning/phases/06-resolution-payouts/06-02-SUMMARY.md
- FOUND: commit 5edd254 (Task 1)
- FOUND: commit 19b49c3 (Task 2)

---
*Phase: 06-resolution-payouts*
*Completed: 2026-03-04*
