---
phase: 11-wire-dispute-frontend-hooks
plan: 02
subsystem: ui
tags: [react, tanstack-query, arcium, mpc, dispute, tiebreaker, fog]

requires:
  - phase: 11-wire-dispute-frontend-hooks
    provides: IDL regeneration with dispute instructions, useOpenDispute hook
  - phase: 08-dispute-system
    provides: On-chain dispute instructions (finalize_dispute, add_tiebreaker)
provides:
  - useFinalizeDispute hook for MPC queue finalize_dispute instruction
  - useAddTiebreaker hook for plain Anchor add_tiebreaker instruction
  - DisputeFinalizedMode with "Reveal Outcome" button and fog intensification
  - DisputePendingMode with quorum-reached, voting-expired, and tie-detected states
  - Auto-tiebreaker trigger on tie detection
affects: []

tech-stack:
  added: []
  patterns:
    - "Permissionless MPC queue hook pattern extended to dispute finalization"
    - "Tie detection via dispute status + voteCount + tiebreakerAdded signals"
    - "FogOverlay density=heavy for MPC processing anticipation effect"

key-files:
  created:
    - app/src/hooks/useFinalizeDispute.ts
    - app/src/hooks/useAddTiebreaker.ts
  modified:
    - app/src/components/market/BetPlacement.tsx

key-decisions:
  - "useFinalizeDispute mirrors useComputePayouts MPC queue pattern exactly"
  - "useAddTiebreaker passes first non-juror resolver PDA; on-chain slot-based selection may require retry"
  - "Tie detection uses composite signal: status=0 AND voteCount>=quorum AND !tiebreakerAdded"

patterns-established:
  - "Dispute finalization: same permissionless MPC queue pattern as compute_payouts"
  - "Auto-trigger pattern: useEffect fires mutation on detected state change"

requirements-completed: [RES-05, RES-06]

duration: 3min
completed: 2026-03-04
---

# Phase 11 Plan 02: Finalize Dispute + Tiebreaker Hooks Summary

**useFinalizeDispute and useAddTiebreaker hooks wired to DisputeFinalizedMode/DisputePendingMode with fog intensification, quorum-reached reveal, and auto-tiebreaker on tie detection**

## Performance

- **Duration:** 3min
- **Started:** 2026-03-04T15:37:23Z
- **Completed:** 2026-03-04T15:41:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- useFinalizeDispute hook submits finalize_dispute MPC queue instruction following useComputePayouts pattern
- useAddTiebreaker hook handles remaining_accounts for resolver PDA tiebreaker selection
- DisputeFinalizedMode replaced useComputePayouts with useFinalizeDispute, "Reveal Outcome" button with fog overlay
- DisputePendingMode covers 4 states: voting active, quorum reached, voting expired, tie detected
- Auto-tiebreaker triggers via useEffect when tie condition detected
- Full dispute E2E lifecycle complete: escalate -> vote -> finalize (or tie -> tiebreaker -> re-vote)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useFinalizeDispute and useAddTiebreaker hooks** - `3ade820` (feat)
2. **Task 2: Wire DisputeFinalizedMode, quorum state, and tie detection** - `b074df0` (feat)

## Files Created/Modified
- `app/src/hooks/useFinalizeDispute.ts` - Permissionless MPC queue hook for finalize_dispute circuit
- `app/src/hooks/useAddTiebreaker.ts` - Plain Anchor hook for add_tiebreaker with resolver remaining_accounts
- `app/src/components/market/BetPlacement.tsx` - DisputeFinalizedMode and DisputePendingMode enhanced with new hooks

## Decisions Made
- useFinalizeDispute mirrors useComputePayouts pattern exactly (same Arcium account derivation, same dynamic import)
- useAddTiebreaker passes first non-juror resolver PDA as remaining_accounts; slot-based selection on-chain may require retry
- Tie detection uses composite signal: dispute.status===0 AND voteCount>=quorum AND !tiebreakerAdded
- FogOverlay wraps MPC processing state for visual "fog churning" anticipation effect
- DisputePendingMode handles wallet-not-connected case with onOpenWallet prompt before Reveal Outcome

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 11 complete -- all dispute frontend hooks wired
- Full dispute lifecycle operational: escalate, vote, finalize, tie + tiebreaker
- v1.0 milestone feature set complete

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 11-wire-dispute-frontend-hooks*
*Completed: 2026-03-04*
