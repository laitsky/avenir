---
phase: 05-encrypted-betting
plan: 01
subsystem: on-chain
tags: [anchor, solana, spl-token, arcium, mpc, betting, init-if-needed]

# Dependency graph
requires:
  - phase: 03-arcium-mpc-core
    provides: "update_pool circuit, ArgBuilder pattern, CallbackAccount pattern, queue_computation macro"
  - phase: 02-market-creation
    provides: "Market PDA, vault PDA, MarketPool PDA, USDC mint constraint pattern"
provides:
  - "place_bet instruction -- user-facing betting entry point with USDC custody transfer"
  - "Market pending bet fields (pending_bettor, pending_amount, pending_is_yes, lock_timestamp)"
  - "Lock timeout recovery with automatic refund for stale MPC locks"
  - "UserPosition PDA pre-creation via init_if_needed"
  - "Extended 6-account callback vector for update_pool_callback"
  - "BetTooSmall, MarketExpired, WrongSide, InsufficientBalance error variants"
affects: [05-encrypted-betting, 06-resolution-payout, 07-frontend-convergence]

# Tech tracking
tech-stack:
  added: [anchor init-if-needed feature]
  patterns: [lock-timeout-recovery-with-refund, unchecked-account-for-conditional-use, extended-callback-accounts]

key-files:
  created:
    - programs/avenir/src/instructions/place_bet.rs
  modified:
    - programs/avenir/Cargo.toml
    - programs/avenir/src/state/market.rs
    - programs/avenir/src/errors.rs
    - programs/avenir/src/instructions/mod.rs
    - programs/avenir/src/lib.rs

key-decisions:
  - "UncheckedAccount for pending_bettor_token_account -- only validated during timeout recovery path, avoids requiring valid TokenAccount when no stale lock exists"
  - "init_if_needed on UserPosition PDA -- Arcium callbacks cannot create accounts, so bettor pays rent upfront"
  - "6-account callback vector extends update_pool_callback with UserPosition, vault, user_token_account, token_program for post-MPC bet finalization"

patterns-established:
  - "Lock timeout recovery: stale lock (>60s) triggers PDA-signed refund from vault to stuck bettor before proceeding with new bet"
  - "UncheckedAccount for conditional accounts: accounts only used in specific code paths can be UncheckedAccount with manual validation in the relevant path"

requirements-completed: [BET-01, BET-02, BET-07, INF-04]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 5 Plan 1: Place Bet Instruction Summary

**place_bet instruction with USDC custody transfer, lock timeout recovery, UserPosition init_if_needed, and update_pool MPC queue**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T03:17:03Z
- **Completed:** 2026-03-04T03:20:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Market struct extended with pending bet tracking fields (pending_bettor, pending_amount, pending_is_yes, lock_timestamp)
- place_bet instruction created with full validation chain: minimum bet, market state, deadline, lock status, side consistency
- Lock timeout recovery automatically refunds stuck bettor when MPC lock is stale (>60s) before processing new bet
- USDC custody transfer via SPL token CPI from bettor to market vault
- UserPosition PDA pre-created with init_if_needed (required because Arcium callbacks cannot create accounts)
- MPC computation queued with 6-account callback vector for post-computation bet finalization

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Market struct, add error variants, enable init-if-needed** - `f7d5fa2` (feat)
2. **Task 2: Create place_bet instruction with USDC transfer, validation, lock timeout recovery, and MPC queue** - `4a792f1` (feat)

## Files Created/Modified
- `programs/avenir/Cargo.toml` - Enabled init-if-needed feature on anchor-lang
- `programs/avenir/src/state/market.rs` - Added lock_timestamp, pending_bettor, pending_amount, pending_is_yes fields
- `programs/avenir/src/errors.rs` - Added BetTooSmall, MarketExpired, WrongSide, InsufficientBalance variants
- `programs/avenir/src/instructions/place_bet.rs` - Complete place_bet instruction (293 lines) with handler and PlaceBet accounts struct
- `programs/avenir/src/instructions/mod.rs` - Registered place_bet module and glob re-export
- `programs/avenir/src/lib.rs` - Added place_bet entry point function

## Decisions Made
- Used UncheckedAccount for pending_bettor_token_account -- only validated during timeout recovery path, avoids requiring a valid TokenAccount when no stale lock exists
- UserPosition PDA created via init_if_needed with bettor as payer -- Arcium callbacks cannot create new accounts
- Extended callback vector to 6 accounts (market_pool, market, user_position, vault, user_token_account, token_program) to give update_pool_callback everything needed for bet finalization

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- place_bet instruction compiles and is registered in lib.rs
- update_pool_callback needs to be extended (Plan 05-02) to handle the 6 callback accounts and update UserPosition
- Market struct changes are pre-launch compatible (no production markets exist)

---
*Phase: 05-encrypted-betting*
*Completed: 2026-03-04*
