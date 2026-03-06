---
phase: 14-repair-dispute-escalation-account-ordering
plan: 02
subsystem: api, dispute
tags: [solana, anchor, juror-selection, fisher-yates, deterministic, hooks, react-query]

# Dependency graph
requires:
  - phase: 14-repair-dispute-escalation-account-ordering
    plan: 01
    provides: selectJurors and selectTiebreakerJuror shared TypeScript module
provides:
  - Correctly wired useOpenDispute hook passing 7 Fisher-Yates selected resolver PDAs
  - Correctly wired useAddTiebreaker hook passing deterministically selected tiebreaker PDA
  - End-to-end client-to-contract alignment for dispute escalation and tiebreaker flows
affects: [dispute-frontend, resolution-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-selection-module-import, deterministic-remaining-accounts]

key-files:
  created: []
  modified:
    - app/src/hooks/useOpenDispute.ts
    - app/src/hooks/useAddTiebreaker.ts

key-decisions:
  - "No additional changes needed beyond import and replacement -- hook structure preserved exactly"

patterns-established:
  - "Deterministic remaining_accounts: compute exact account ordering client-side before TX submission"
  - "Shared selection module: single source of truth for juror algorithms across hooks"

requirements-completed: [RES-03, RES-06]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 14 Plan 02: Wire Juror Selection into Dispute Hooks Summary

**Replaced broken all-resolvers and guess-first-candidate logic in useOpenDispute and useAddTiebreaker with deterministic selectJurors/selectTiebreakerJuror calls matching on-chain algorithms**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T07:41:01Z
- **Completed:** 2026-03-06T07:42:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- useOpenDispute now passes exactly 7 resolver PDAs in Fisher-Yates computed order via selectJurors, replacing the bug that passed ALL resolvers in registry order
- useAddTiebreaker now uses selectTiebreakerJuror with market_id and voteCount seed to deterministically select the tiebreaker juror, replacing the slot-luck-dependent first-candidate guess
- All 25 app-side tests pass (13 juror-selection + 12 client-encryption); TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire selectJurors into useOpenDispute** - `b44bef2` (feat)
2. **Task 2: Wire selectTiebreakerJuror into useAddTiebreaker** - `7fe29d5` (feat)

## Files Created/Modified
- `app/src/hooks/useOpenDispute.ts` - Imports selectJurors; builds remaining_accounts from 7 selected jurors instead of all resolvers; updated JSDoc
- `app/src/hooks/useAddTiebreaker.ts` - Imports selectTiebreakerJuror; fetches voteCount from dispute; computes exact tiebreaker selection; updated JSDoc

## Decisions Made
- No additional changes needed beyond import and replacement -- the existing hook structure (mutation flow, error handling, retry logic, remaining_accounts shape) was preserved exactly as specified in the plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dispute escalation and tiebreaker flows are now fully aligned between client and on-chain contract
- RES-03 (dispute account ordering) and RES-06 (tiebreaker determinism) are complete
- Phase 14 is fully complete -- both plans executed successfully

## Self-Check: PASSED

- All 2 modified source files exist on disk
- All 2 commit hashes verified in git log
- SUMMARY.md created successfully

---
*Phase: 14-repair-dispute-escalation-account-ordering*
*Completed: 2026-03-06*
