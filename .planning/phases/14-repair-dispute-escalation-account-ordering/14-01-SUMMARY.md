---
phase: 14-repair-dispute-escalation-account-ordering
plan: 01
subsystem: dispute, api
tags: [solana, anchor, fisher-yates, lcg, bigint, juror-selection, deterministic]

# Dependency graph
requires:
  - phase: 08-dispute-system
    provides: Fisher-Yates juror selection and tiebreaker logic in Rust
provides:
  - Predictable on-chain juror selection seeds (no clock.slot)
  - Shared juror-selection.ts module with selectJurors and selectTiebreakerJuror
  - Cross-verification tests proving TS matches Rust algorithm parity
affects: [14-02, useOpenDispute, useAddTiebreaker]

# Tech tracking
tech-stack:
  added: []
  patterns: [bigint-u64-wrapping-arithmetic, client-predictable-seed]

key-files:
  created:
    - app/src/lib/juror-selection.ts
    - app/src/lib/juror-selection.test.ts
  modified:
    - programs/avenir/src/instructions/open_dispute.rs
    - programs/avenir/src/instructions/add_tiebreaker.rs
    - app/src/lib/idl/avenir.json
    - app/src/lib/idl/avenir.ts

key-decisions:
  - "market.id alone as open_dispute seed (simplest predictable value)"
  - "BigInt u64 masking after each wrapping operation for Rust parity"

patterns-established:
  - "BigInt wrapping: ((a & U64_MAX) * b + c) & U64_MAX mirrors Rust wrapping_mul/wrapping_add"
  - "Deterministic PDA generation in tests using findProgramAddressSync with sequential seeds"

requirements-completed: [RES-03]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 14 Plan 01: Predictable Juror Selection Summary

**Deterministic juror selection seeds (no clock.slot) with shared TypeScript Fisher-Yates module matching on-chain LCG algorithm**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T07:35:09Z
- **Completed:** 2026-03-06T07:38:58Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Removed clock.slot from both open_dispute.rs and add_tiebreaker.rs seeds, making juror selection client-predictable
- Created juror-selection.ts with selectJurors (Fisher-Yates) and selectTiebreakerJuror (sequential scan) using identical LCG constants
- 13 unit tests proving determinism, subset correctness, no-duplicates, BigInt wrapping parity, and tiebreaker edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Change on-chain seeds and rebuild IDL** - `2e5c441` (feat)
2. **Task 2 RED: Failing juror-selection tests** - `4e9b970` (test)
3. **Task 2 GREEN: Implement juror-selection.ts** - `5e6561a` (feat)

## Files Created/Modified
- `programs/avenir/src/instructions/open_dispute.rs` - Seed changed from `market.id ^ clock.slot` to `market.id`
- `programs/avenir/src/instructions/add_tiebreaker.rs` - Removed `^ clock.slot` from seed computation
- `app/src/lib/idl/avenir.json` - Regenerated IDL after on-chain changes
- `app/src/lib/idl/avenir.ts` - Regenerated TypeScript IDL types
- `app/src/lib/juror-selection.ts` - Shared Fisher-Yates + tiebreaker selection with u64 BigInt wrapping
- `app/src/lib/juror-selection.test.ts` - 13 cross-verification tests

## Decisions Made
- Used `market.id` alone as open_dispute seed -- simplest predictable value, no additional entropy needed for admin-approved resolver pool
- BigInt u64 masking applied after each wrapping operation: `((seed + BigInt(i)) & U64_MAX) * LCG + 1n) & U64_MAX` ensures exact Rust parity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- juror-selection.ts exports ready for integration into useOpenDispute and useAddTiebreaker hooks (Plan 02)
- IDL regenerated and copied to app, ready for frontend hook updates
- All 25 app-side tests pass (13 juror-selection + 12 client-encryption)

## Self-Check: PASSED

- All 3 created/modified source files exist on disk
- All 3 commit hashes verified in git log

---
*Phase: 14-repair-dispute-escalation-account-ordering*
*Completed: 2026-03-06*
