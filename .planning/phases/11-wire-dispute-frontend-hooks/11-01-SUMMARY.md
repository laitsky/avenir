---
phase: 11-wire-dispute-frontend-hooks
plan: 01
subsystem: ui
tags: [solana, anchor, arcium, dispute, hooks, react, tanstack-query]

# Dependency graph
requires:
  - phase: 08-dispute-system
    provides: "On-chain dispute instructions (open_dispute, init_dispute_tally, cast_vote, finalize_dispute, add_tiebreaker)"
  - phase: 07-core-ui-integration
    provides: "BetPlacement mode state machine, useAnchorProgram, useReadOnlyProgram, PDA helpers"
provides:
  - "Regenerated IDL with all dispute instructions (35 total vs 20 previously)"
  - "useOpenDispute hook chaining open_dispute + init_dispute_tally as 2-step TX flow"
  - "Working DisputeEscalateMode with 2-step progress and resolver pre-check"
affects: [11-02-PLAN, dispute-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns: ["2-step chained TX with partial failure recovery (open_dispute succeeds, init_dispute_tally retryable)"]

key-files:
  created:
    - "app/src/hooks/useOpenDispute.ts"
  modified:
    - "app/src/lib/idl/avenir.json"
    - "app/src/lib/idl/avenir.ts"
    - "app/src/components/market/BetPlacement.tsx"

key-decisions:
  - "anchor build regenerates IDL successfully despite stack warnings -- no manual IDL patching needed"
  - "disputeOpened state tracks partial success for retry-only-init_dispute_tally recovery pattern"

patterns-established:
  - "Chained TX hook pattern: first TX sets state flag, retry logic skips completed TX on re-attempt"
  - "EscalateProgress mirrors BetProgress visual pattern with amber theme for dispute-specific flows"

requirements-completed: [RES-03]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 11 Plan 01: IDL Regeneration + useOpenDispute Hook Summary

**Regenerated IDL with 15 new dispute instructions and created useOpenDispute hook chaining open_dispute + init_dispute_tally with 2-step progress UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T15:31:48Z
- **Completed:** 2026-03-04T15:34:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Regenerated IDL from anchor build includes all 35 instructions (15 new dispute/resolver instructions)
- useOpenDispute hook chains open_dispute + init_dispute_tally with step-based progress tracking
- DisputeEscalateMode wired to useOpenDispute with 2-step progress indicator
- Resolver pre-check disables escalate button when fewer than 7 active resolvers
- Partial failure recovery: if init_dispute_tally fails, retry only retries that step

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate IDL and create useOpenDispute hook** - `5729ea9` (feat)
2. **Task 2: Wire DisputeEscalateMode to useOpenDispute with 2-step progress** - `9964381` (feat)

## Files Created/Modified
- `app/src/lib/idl/avenir.json` - Regenerated IDL with all dispute instructions
- `app/src/lib/idl/avenir.ts` - Regenerated TypeScript types for IDL
- `app/src/hooks/useOpenDispute.ts` - Hook chaining open_dispute + init_dispute_tally with step tracking
- `app/src/components/market/BetPlacement.tsx` - DisputeEscalateMode wired to useOpenDispute, EscalateProgress component added

## Decisions Made
- anchor build succeeded despite stack overflow warnings -- used regenerated IDL directly instead of manual patching
- disputeOpened state flag tracks whether open_dispute TX already landed, enabling retry-only-init_dispute_tally recovery
- Resolver count fetched on mount via useReadOnlyProgram (no wallet needed) for pre-check UX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useOpenDispute hook complete and wired to DisputeEscalateMode
- IDL includes all dispute instructions needed for Plan 02 (useFinalizeDispute, useAddTiebreaker)
- Plan 02 can reference the same Arcium account derivation pattern established here

---
*Phase: 11-wire-dispute-frontend-hooks*
*Completed: 2026-03-04*
