---
phase: 08-dispute-system
plan: 02
subsystem: on-chain
tags: [anchor, solana, dispute, juror-selection, pda, mpc, fisher-yates]

requires:
  - phase: 08-01
    provides: "Resolver and ResolverRegistry PDAs with staking/approval"
provides:
  - "Dispute PDA with juror list, vote tracking, status enum, timestamps"
  - "DisputeTally fixed-layout PDA for MPC encrypted vote accumulators"
  - "open_dispute instruction with deterministic 7-juror selection"
  - "Market state transition to Disputed(3) after grace period expiry"
affects: [08-03, 08-04, 08-05, 08-06]

tech-stack:
  added: []
  patterns: [deterministic-juror-selection, dispute-state-machine, remaining-accounts-validation]

key-files:
  created:
    - programs/avenir/src/state/dispute.rs
    - programs/avenir/src/state/dispute_tally.rs
    - programs/avenir/src/instructions/open_dispute.rs
  modified:
    - programs/avenir/src/state/mod.rs
    - programs/avenir/src/instructions/mod.rs
    - programs/avenir/src/errors.rs
    - programs/avenir/src/lib.rs

key-decisions:
  - "LCG-based deterministic juror selection using market_id XOR slot as seed"
  - "DisputeTally mirrors MarketPool fixed-layout pattern (offset 16, length 64) for MPC"
  - "Remaining accounts pattern for Resolver PDA validation and active_disputes increment"

patterns-established:
  - "Deterministic juror selection: Fisher-Yates partial shuffle with LCG hash"
  - "DisputeTally fixed-layout: same byte offset pattern as MarketPool for ArgBuilder.account()"
  - "Dispute state machine: Voting(0) -> Finalizing(1) -> Settled(2)"

requirements-completed: [RES-03]

duration: 2min
completed: 2026-03-04
---

# Phase 8 Plan 02: Dispute Filing Summary

**Dispute escalation with deterministic 7-juror selection from resolver registry, Dispute/DisputeTally PDAs, and market state transition to Disputed(3)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T11:24:29Z
- **Completed:** 2026-03-04T11:26:49Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Dispute PDA stores juror list (up to 8), stake snapshots, vote bitfield, voting window, and status enum
- DisputeTally PDA mirrors MarketPool fixed-layout pattern with identical byte offsets (16, 64) for MPC circuit compatibility
- open_dispute instruction validates caller participation, grace period expiry, market state, MPC lock, and resolver count before selecting 7 jurors deterministically
- Each selected resolver's active_disputes counter incremented via remaining_accounts with PDA seed validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Dispute and DisputeTally state accounts** - `eb29760` (feat)
2. **Task 2: Implement open_dispute instruction with deterministic juror selection** - `157e8b7` (feat)

## Files Created/Modified
- `programs/avenir/src/state/dispute.rs` - Dispute PDA with juror panel, vote tracking, status enum, timestamps
- `programs/avenir/src/state/dispute_tally.rs` - Fixed-layout MPC target PDA with encrypted vote accumulators
- `programs/avenir/src/state/mod.rs` - Added dispute and dispute_tally module exports
- `programs/avenir/src/instructions/open_dispute.rs` - Dispute escalation handler with juror selection logic
- `programs/avenir/src/instructions/mod.rs` - Added open_dispute module export
- `programs/avenir/src/errors.rs` - Added NotMarketParticipant, MarketAlreadyDisputed, GracePeriodNotExpired, NotEnoughResolvers
- `programs/avenir/src/lib.rs` - Added open_dispute entry point with lifetime-annotated Context

## Decisions Made
- Used LCG-based deterministic selection (seed = market_id XOR clock.slot, multiplier = 6364136223846793005) for reproducible juror assignment
- DisputeTally follows exact MarketPool fixed-layout pattern so the same ArgBuilder.account() byte offsets work for MPC dispute tally circuits
- Resolver PDA validation in remaining_accounts uses find_program_address to verify each account matches the selected juror's wallet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dispute and DisputeTally PDAs ready for Plan 03 (init_dispute_tally MPC circuit)
- Juror selection complete, voting infrastructure (cast_vote) ready for Plan 04
- Market state Disputed(3) transition enables UI dispute indicators in Phase 9

---
*Phase: 08-dispute-system*
*Completed: 2026-03-04*
