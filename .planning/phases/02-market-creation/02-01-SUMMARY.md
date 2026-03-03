---
phase: 02-market-creation
plan: 01
subsystem: on-chain
tags: [anchor, solana, pda, whitelist, market, usdc-vault, spl-token]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Config PDA with admin/usdc_mint/market_counter, Anchor project scaffold, error enum"
provides:
  - "CreatorWhitelist PDA account for gating market creation"
  - "add_creator / remove_creator admin instructions"
  - "create_market instruction with USDC vault initialization"
  - "Market struct with resolution_source field"
  - "Six new error variants for Phase 2 validations"
affects: [02-market-creation, 03-encrypted-relay, 05-betting-engine]

# Tech tracking
tech-stack:
  added: [anchor-spl token constraints]
  patterns: [admin-gated PDA creation, PDA close-with-rent-return, token vault init via Anchor constraints, seed-based market counter derivation]

key-files:
  created:
    - programs/avenir/src/state/creator_whitelist.rs
    - programs/avenir/src/instructions/add_creator.rs
    - programs/avenir/src/instructions/remove_creator.rs
    - programs/avenir/src/instructions/create_market.rs
  modified:
    - programs/avenir/src/state/market.rs
    - programs/avenir/src/state/mod.rs
    - programs/avenir/src/instructions/mod.rs
    - programs/avenir/src/lib.rs
    - programs/avenir/src/errors.rs

key-decisions:
  - "Used Anchor seeds constraint with config.market_counter.checked_add(1) directly -- no need for param-based market_id fallback"
  - "CreatorWhitelist PDA closed on removal (rent returned to admin) rather than soft-delete with active=false"

patterns-established:
  - "Admin-gated instruction pattern: has_one = admin + !config.paused constraint"
  - "PDA close pattern: close = admin returns rent automatically"
  - "Vault init pattern: token::mint + token::authority in Anchor init constraint"
  - "Market counter pattern: config.market_counter + 1 as seed, incremented in handler"

requirements-completed: [MKT-01, MKT-02, MKT-03]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 2 Plan 1: Whitelist & Market Creation Summary

**Creator whitelist system with admin add/remove and whitelist-gated market creation with USDC vault, category/deadline/resolution-source validations**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T03:02:21Z
- **Completed:** 2026-03-03T03:04:53Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- CreatorWhitelist PDA with admin-only add/remove instructions and automatic rent return on close
- create_market instruction that enforces whitelist gating, initializes Market PDA + USDC vault atomically
- Full validation suite: category 0-4, deadline >= 1h future, non-empty question/resolution_source, protocol pause check
- Market struct extended with resolution_source field for immutable resolution reference

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CreatorWhitelist PDA and add/remove instructions** - `ccde3f7` (feat)
2. **Task 2: Add resolution_source to Market and implement create_market** - `f2e94ca` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `programs/avenir/src/state/creator_whitelist.rs` - CreatorWhitelist PDA struct (creator, active, bump)
- `programs/avenir/src/instructions/add_creator.rs` - Admin-only instruction to whitelist a creator
- `programs/avenir/src/instructions/remove_creator.rs` - Admin-only instruction to remove creator (closes PDA, returns rent)
- `programs/avenir/src/instructions/create_market.rs` - Market creation with vault init, whitelist check, all validations
- `programs/avenir/src/state/market.rs` - Added resolution_source field with #[max_len(128)]
- `programs/avenir/src/state/mod.rs` - Added creator_whitelist module
- `programs/avenir/src/instructions/mod.rs` - Added add_creator, remove_creator, create_market modules
- `programs/avenir/src/lib.rs` - Wired 3 new program endpoints
- `programs/avenir/src/errors.rs` - Added 6 error variants: ProtocolPaused, CreatorNotWhitelisted, DeadlineTooSoon, EmptyResolutionSource, EmptyQuestion, MarketHasBets

## Decisions Made
- Used Anchor seeds constraint with `config.market_counter.checked_add(1)` directly in seeds -- Anchor 0.32.1 supports inline method calls in seeds, no need for the param-based market_id fallback approach
- CreatorWhitelist PDA uses `close = admin` for hard deletion rather than soft-delete (active=false) -- simpler, returns rent, and per CONTEXT.md removing a creator does not affect existing markets

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks compiled on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Whitelist and market creation instructions ready for integration testing in 02-02
- Market PDA and vault pattern established for betting engine (Phase 5)
- resolution_source field available for oracle/resolution instructions (future phases)

## Self-Check: PASSED

All 10 files verified present. Both task commits (ccde3f7, f2e94ca) verified in git log.

---
*Phase: 02-market-creation*
*Completed: 2026-03-03*
