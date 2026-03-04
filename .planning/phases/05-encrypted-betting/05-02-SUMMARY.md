---
phase: 05-encrypted-betting
plan: 02
subsystem: on-chain
tags: [anchor, solana, spl-token, arcium, mpc, callback, refund, user-position]

# Dependency graph
requires:
  - phase: 05-encrypted-betting
    plan: 01
    provides: "place_bet instruction with 6-account callback vector, pending bet fields on Market, UserPosition init_if_needed"
  - phase: 03-arcium-mpc-core
    provides: "update_pool circuit, callback_accounts macro, MXEEncryptedStruct output, UpdatePoolOutput type"
provides:
  - "update_pool_callback with full success path: pool ciphertext write, sentiment update, UserPosition accumulation, total_bets increment"
  - "update_pool_callback with failure path: PDA-signed USDC refund from vault to bettor"
  - "Both paths clear mpc_lock, lock_timestamp, and all pending fields"
affects: [06-resolution-payout, 07-frontend-convergence]

# Tech tracking
tech-stack:
  added: []
  patterns: [borrow-checker-safe-cpi-with-value-extraction, function-scoped-imports-for-callback-handlers]

key-files:
  created: []
  modified:
    - programs/avenir/src/instructions/mpc/update_pool_callback.rs
    - programs/avenir/src/instructions/mpc/update_pool.rs
    - programs/avenir/src/lib.rs

key-decisions:
  - "Extract market_id, bump, pending_amount into local variables before CPI to satisfy borrow checker -- re-acquire mutable borrow after transfer"
  - "Use function-scoped imports (use anchor_spl::token::{self, Transfer}) inside callback handler body rather than module-level to avoid unused import warnings in struct file"
  - "Skip setting UserPosition.bump in callback -- already set by init_if_needed in place_bet, callback only accumulates amounts"

patterns-established:
  - "Borrow-checker-safe CPI pattern: extract Copy values before CPI borrows, re-acquire mut ref after"
  - "Callback dual-path pattern: success writes state + clears pending, failure refunds USDC + clears pending, both release lock"

requirements-completed: [BET-03, BET-04, BET-05, BET-06]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 5 Plan 2: Update Pool Callback Summary

**Full bet lifecycle callback with encrypted pool write, sentiment update, UserPosition accumulation on success and PDA-signed USDC refund on failure**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T03:23:15Z
- **Completed:** 2026-03-04T03:25:27Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- UpdatePoolCallback struct extended with 4 new accounts (user_position, market_vault, bettor_token_account, token_program) matching place_bet's 6-account callback vector
- Success path: writes encrypted pool ciphertexts to MarketPool, sentiment to Market, accumulates pending_amount into UserPosition.yes_amount or .no_amount, increments total_bets with checked_add
- Failure path: refunds pending_amount USDC from vault to bettor via PDA-signed token::transfer, does NOT touch pool or UserPosition
- Both paths clear mpc_lock, lock_timestamp, pending_bettor, pending_amount, pending_is_yes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend UpdatePoolCallback struct with UserPosition, vault, token accounts** - `44f5967` (feat)
2. **Task 2: Implement callback handler with success path (pool + sentiment + position) and failure path (refund)** - `5b9e67e` (feat)

## Files Created/Modified
- `programs/avenir/src/instructions/mpc/update_pool_callback.rs` - Added user_position, market_vault, bettor_token_account, token_program accounts; added anchor_spl and UserPosition imports
- `programs/avenir/src/instructions/mpc/update_pool.rs` - Added deprecation comment noting superseded by place_bet
- `programs/avenir/src/lib.rs` - Refactored update_pool_callback handler with full success/failure paths

## Decisions Made
- Extracted market_id, bump, pending_amount into local variables before CPI call to satisfy Rust borrow checker -- the CPI borrows ctx.accounts immutably, so mutable fields must be read first
- Used function-scoped imports (`use anchor_spl::token::{self, Transfer}`) inside the callback handler body to keep the struct file clean of unused imports
- Skipped setting UserPosition fields (market_id, user, bump) in callback -- these are already set by init_if_needed in place_bet; callback only accumulates bet amounts
- Used checked_add for position amounts and total_bets to prevent integer overflow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full bet lifecycle is now complete: place_bet (USDC transfer + MPC queue) -> update_pool circuit -> update_pool_callback (persist results or refund)
- Ready for Plan 05-03 (integration testing / timeout scenarios)
- Phase 6 (resolution + payout) can reference UserPosition for payout calculations

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 05-encrypted-betting*
*Completed: 2026-03-04*
