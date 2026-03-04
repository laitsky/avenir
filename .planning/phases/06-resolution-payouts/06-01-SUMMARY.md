---
phase: 06-resolution-payouts
plan: 01
subsystem: on-chain
tags: [anchor, arcium, arcis, mpc, resolution, market-state]

# Dependency graph
requires:
  - phase: 05-encrypted-betting
    provides: Market struct with mpc_lock, MarketPool, PoolTotals type, encrypted-ixs circuit patterns
provides:
  - resolve_market instruction (creator declares winning outcome, Open -> Resolved transition)
  - Market.revealed_yes_pool and Market.revealed_no_pool fields for payout math
  - compute_payouts circuit (reveals encrypted pool totals as plaintext u64 values)
  - 7 new AvenirError variants for resolution and payout error handling
affects: [06-02-PLAN, 06-03-PLAN, 06-04-PLAN, phase-07-frontend, phase-08-disputes]

# Tech tracking
tech-stack:
  added: []
  patterns: [simple state-transition instruction with creator validation, MPC circuit that reveals encrypted state to plaintext]

key-files:
  created:
    - programs/avenir/src/instructions/resolve_market.rs
  modified:
    - programs/avenir/src/state/market.rs
    - programs/avenir/src/errors.rs
    - programs/avenir/src/instructions/mod.rs
    - programs/avenir/src/lib.rs
    - encrypted-ixs/src/lib.rs

key-decisions:
  - "resolve_market transitions directly Open(0) -> Resolved(2) with no intermediate Locked(1) state"
  - "compute_payouts circuit takes only Enc<Mxe, PoolTotals> -- no user-encrypted input, simpler than update_pool"
  - "ComputePayoutsOutput type not yet generated -- requires callback handler definition in Plan 02"

patterns-established:
  - "Simple state-transition instruction: validate caller, check state, check deadline, set new state atomically"
  - "MPC reveal circuit: .reveal() on array elements to produce plaintext output tuple"

requirements-completed: [RES-01, RES-02]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 6 Plan 01: Resolution Foundation Summary

**resolve_market instruction with creator/deadline/mpc_lock validation and compute_payouts Arcis circuit that reveals encrypted PoolTotals as plaintext (u64, u64)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T07:50:47Z
- **Completed:** 2026-03-04T07:53:21Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Market struct extended with revealed_yes_pool and revealed_no_pool fields plus Finalized(4) state documentation
- 7 new error variants added for complete resolution and payout error handling
- resolve_market instruction validates creator identity, market state, deadline, mpc_lock, and winning_outcome
- compute_payouts circuit compiles and reveals both encrypted pool totals as plaintext u64 values

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Market struct and add error variants** - `35048b4` (feat)
2. **Task 2: Create resolve_market instruction and compute_payouts circuit** - `01825e3` (feat)

## Files Created/Modified
- `programs/avenir/src/instructions/resolve_market.rs` - resolve_market handler with creator validation, deadline check, mpc_lock check, outcome validation, and ResolveMarket account struct
- `programs/avenir/src/state/market.rs` - Added revealed_yes_pool and revealed_no_pool u64 fields, updated state comment to include Finalized(4)
- `programs/avenir/src/errors.rs` - Added MarketNotResolved, MarketNotFinalized, NoWinningPosition, AlreadyClaimed, NotMarketCreator, MarketNotExpired, InvalidOutcome
- `programs/avenir/src/instructions/mod.rs` - Added resolve_market module declaration and re-export
- `programs/avenir/src/lib.rs` - Added resolve_market entry point delegating to handler
- `encrypted-ixs/src/lib.rs` - Added compute_payouts circuit with Enc<Mxe, PoolTotals> input returning (u64, u64) via .reveal()

## Decisions Made
- resolve_market goes directly Open(0) -> Resolved(2) with no intermediate Locked(1) state -- simpler and matches CONTEXT.md state flow
- compute_payouts circuit takes only Enc<Mxe, PoolTotals> (account read) -- no user-encrypted input needed since this is a reveal operation, not a user computation
- ComputePayoutsOutput type will be generated when Plan 02 adds the arcium_callback handler -- confirmed by checking target/types/ post-build

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing SBF stack overflow warnings from place_bet function appeared during anchor build -- these are out of scope (logged in deferred-items.md if not already known)
- ComputePayoutsOutput not in target/types/ after build -- expected behavior since the callback handler is not yet defined (Plan 02 scope)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- resolve_market instruction ready for integration testing
- compute_payouts circuit compiled and ready for comp_def registration, queue instruction, and callback (Plan 02)
- Market struct has all fields needed for Plan 02 (compute_payouts_callback) and Plan 03 (claim_payout)
- All 7 error variants available for Plan 02, 03, and 04

## Self-Check: PASSED

- FOUND: programs/avenir/src/instructions/resolve_market.rs
- FOUND: .planning/phases/06-resolution-payouts/06-01-SUMMARY.md
- FOUND: commit 35048b4 (Task 1)
- FOUND: commit 01825e3 (Task 2)

---
*Phase: 06-resolution-payouts*
*Completed: 2026-03-04*
