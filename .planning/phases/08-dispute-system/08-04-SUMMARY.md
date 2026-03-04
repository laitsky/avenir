---
phase: 08-dispute-system
plan: 04
subsystem: mpc
tags: [arcium, mpc, finalize-dispute, tiebreaker, slashing, dispute-resolution]

# Dependency graph
requires:
  - phase: 08-dispute-system/03
    provides: "Encrypted voting MPC circuits (init_dispute_tally, add_dispute_vote, cast_vote)"
  - phase: 06-resolution-payouts
    provides: "compute_payouts MPC pattern (account-only ArgBuilder, reveal circuit)"
provides:
  - "finalize_dispute MPC circuit (reveals encrypted VoteTotals as plaintext)"
  - "Dispute resolution callback (market outcome based on majority vote, tie detection)"
  - "add_tiebreaker instruction (8th juror, 24h extension, quorum bump)"
  - "settle_dispute_rewards instruction (non-voter 0.5% slash, active_disputes cleanup)"
affects: [08-dispute-system/05, 08-dispute-system/06]

# Tech tracking
tech-stack:
  added: []
  patterns: ["finalize_dispute mirrors compute_payouts account-only MPC pattern", "V1 privacy-preserving settlement (no individual vote reveal)"]

key-files:
  created:
    - "encrypted-ixs/src/lib.rs (finalize_dispute circuit)"
    - "programs/avenir/src/instructions/mpc/finalize_dispute_comp_def.rs"
    - "programs/avenir/src/instructions/mpc/finalize_dispute.rs"
    - "programs/avenir/src/instructions/mpc/finalize_dispute_callback.rs"
    - "programs/avenir/src/instructions/add_tiebreaker.rs"
    - "programs/avenir/src/instructions/settle_dispute_rewards.rs"
  modified:
    - "programs/avenir/src/instructions/mpc/mod.rs"
    - "programs/avenir/src/instructions/mod.rs"
    - "programs/avenir/src/lib.rs"
    - "programs/avenir/src/errors.rs"

key-decisions:
  - "V1 settlement preserves vote privacy: only non-voters slashed (0.5%), no majority/minority distinction since individual votes cannot be revealed on-chain"
  - "Tie detection in callback reverts dispute.status to Voting without resolving market, enabling tiebreaker flow"
  - "Deterministic tiebreaker selection uses wrapping_mul seed to avoid bias in registry iteration"

patterns-established:
  - "Account-only MPC reveal pattern: finalize_dispute reads DisputeTally ciphertexts and reveals both as plaintext u64"
  - "Tie handling: callback reverts status, separate add_tiebreaker extends window and adds juror"

requirements-completed: [RES-06]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 8 Plan 4: Dispute Resolution & Settlement Summary

**finalize_dispute MPC circuit revealing vote totals, market resolution via majority vote, tie-breaking mechanism, and non-voter slashing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T11:39:02Z
- **Completed:** 2026-03-04T11:44:06Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- finalize_dispute circuit in encrypted-ixs reveals VoteTotals as plaintext (u64, u64)
- Callback resolves market based on majority weighted votes (Yes wins / No wins / Tie detection)
- add_tiebreaker instruction selects 8th juror, extends voting 24h, bumps quorum to 6
- settle_dispute_rewards handles non-voter 0.5% slash and active_disputes cleanup
- After dispute settlement, market transitions to Resolved(2) enabling standard compute_payouts -> claim_payout pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Add finalize_dispute circuit and MPC queue/callback infrastructure** - `d3dea6c` (feat)
2. **Task 2: Implement add_tiebreaker instruction and settle_dispute_rewards** - `e77850a` (feat)

## Files Created/Modified
- `encrypted-ixs/src/lib.rs` - Added finalize_dispute circuit (reveals VoteTotals as plaintext)
- `programs/avenir/src/instructions/mpc/finalize_dispute_comp_def.rs` - Register finalize_dispute circuit
- `programs/avenir/src/instructions/mpc/finalize_dispute.rs` - Queue finalize_dispute MPC (validates quorum, sets lock, transitions to Finalizing)
- `programs/avenir/src/instructions/mpc/finalize_dispute_callback.rs` - Callback accounts struct for finalize_dispute
- `programs/avenir/src/instructions/add_tiebreaker.rs` - Adds 8th juror on tie, extends voting 24h, bumps quorum
- `programs/avenir/src/instructions/settle_dispute_rewards.rs` - Non-voter slash (0.5%) and active_disputes decrement
- `programs/avenir/src/instructions/mpc/mod.rs` - Added 3 new module declarations and re-exports
- `programs/avenir/src/instructions/mod.rs` - Added add_tiebreaker and settle_dispute_rewards modules
- `programs/avenir/src/lib.rs` - Added entrypoints + arcium_callback handler for finalize_dispute
- `programs/avenir/src/errors.rs` - Added QuorumNotReached, TiebreakerAlreadyAdded, DisputeNotSettled

## Decisions Made
- V1 settlement preserves vote privacy: only non-voters are slashed (0.5%). Individual majority/minority cannot be determined on-chain without revealing individual votes, so per-CONTEXT.md discretion, this simpler model is used.
- Tie detection in finalize_dispute_callback reverts dispute.status to 0 (Voting) without resolving the market, allowing add_tiebreaker to be called next.
- Deterministic tiebreaker juror selection uses wrapping_mul with market_id as LCG seed, XOR with clock.slot and vote_count, iterating registry to find first non-duplicate.
- Resolver vault uses self-authority pattern (vault PDA signs for its own transfers) for slash transfers.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dispute lifecycle complete: escalate -> vote -> finalize -> tiebreak (if tie) -> settle rewards
- After dispute settlement, market is in Resolved(2) state, flowing into standard compute_payouts -> claim_payout pipeline
- Ready for Plan 05 (dispute UI components) and Plan 06 (dispute integration tests)

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (d3dea6c, e77850a) verified in git log.

---
*Phase: 08-dispute-system*
*Completed: 2026-03-04*
