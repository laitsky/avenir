---
phase: 06-resolution-payouts
plan: 03
subsystem: on-chain
tags: [solana, anchor, spl-token, payout, fee, usdc, cpi]

# Dependency graph
requires:
  - phase: 06-02
    provides: "compute_payouts MPC pipeline that transitions Market to Finalized with revealed pool totals"
provides:
  - "claim_payout instruction for proportional USDC distribution to winners"
  - "Protocol fee deduction (2% / 200 bps) via SPL Token CPI to fee recipient"
  - "Double-claim prevention via UserPosition.claimed flag"
affects: [06-04, 07-frontend-integration, 08-disputes]

# Tech tracking
tech-stack:
  added: []
  patterns: ["u128 intermediate arithmetic for overflow-safe payout math", "conditional fee CPI (skip if fee==0)"]

key-files:
  created:
    - programs/avenir/src/instructions/claim_payout.rs
  modified:
    - programs/avenir/src/instructions/mod.rs
    - programs/avenir/src/lib.rs

key-decisions:
  - "Market account is immutable in ClaimPayout (only UserPosition needs mut for claimed flag)"
  - "Fee transfer skipped when fee==0 (avoids empty CPI for edge case of all-bets-on-one-side with 0 bps)"

patterns-established:
  - "Proportional payout: gross = user_winning * total_pool / winning_pool, all via u128 intermediates"
  - "Extract Copy values before CPI borrow (market_id, bump) to satisfy Rust borrow checker"

requirements-completed: [RES-07, RES-08]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 6 Plan 3: Claim Payout Summary

**Proportional USDC payout instruction with u128 overflow-safe math, 2% protocol fee CPI, and double-claim prevention**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T08:04:22Z
- **Completed:** 2026-03-04T08:06:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- claim_payout instruction with complete proportional payout formula (gross, fee, net)
- Two SPL Token CPI transfers: net_payout to winner, fee to config_fee_recipient
- Validation chain: MarketNotFinalized, AlreadyClaimed, NoWinningPosition
- claimPayout visible in generated IDL (anchor build succeeds)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create claim_payout instruction with proportional payout and fee transfer** - `e52cdb2` (feat)
2. **Task 2: Wire claim_payout entry point into instructions/mod.rs and lib.rs** - `3d58953` (feat)

## Files Created/Modified
- `programs/avenir/src/instructions/claim_payout.rs` - Claim payout handler with proportional math, fee deduction, two SPL Token CPIs, and ClaimPayout accounts struct
- `programs/avenir/src/instructions/mod.rs` - Added claim_payout module declaration and glob re-export
- `programs/avenir/src/lib.rs` - Added claim_payout entry point in avenir module

## Decisions Made
- Market account kept immutable in ClaimPayout struct -- only reads revealed pool totals and fee config; UserPosition is the only mutable account (for claimed flag)
- Fee transfer conditional on fee > 0 -- avoids unnecessary CPI when config_fee_bps is 0 or when rounding makes fee 0
- No additional parameters on claim_payout -- all data sourced from Market and UserPosition accounts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Claim payout instruction complete -- winners can collect proportional USDC after finalization
- Ready for Plan 04 (resolution integration tests) to validate the full resolve->compute_payouts->claim_payout flow
- Pre-existing place_bet stack size warnings remain (not related to this plan)

---
*Phase: 06-resolution-payouts*
*Completed: 2026-03-04*
