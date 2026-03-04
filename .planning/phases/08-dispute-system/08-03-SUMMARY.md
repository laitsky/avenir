---
phase: 08-dispute-system
plan: 03
subsystem: mpc
tags: [arcium, mpc, encrypted-voting, dispute, circuits, vote-tally]

# Dependency graph
requires:
  - phase: 08-dispute-system/02
    provides: "Dispute and DisputeTally PDA state accounts"
  - phase: 03-arcium-mpc-core
    provides: "MPC circuit patterns (init_pool, update_pool), ArgBuilder, queue_computation"
provides:
  - "init_dispute_tally MPC circuit (encrypted zero VoteTotals)"
  - "add_dispute_vote MPC circuit (stake-weighted encrypted vote accumulation)"
  - "cast_vote instruction (juror-facing vote submission with MPC queue)"
  - "Full MPC queue/callback infrastructure for dispute voting"
affects: [08-dispute-system/04, 08-dispute-system/05, 08-dispute-system/06]

# Tech tracking
tech-stack:
  added: []
  patterns: ["plaintext_u64 in ArgBuilder for public stake weights", "scoped mutable borrow pattern for borrow checker with queue_computation"]

key-files:
  created:
    - "encrypted-ixs/src/lib.rs (VoteTotals, VoteInput, init_dispute_tally, add_dispute_vote circuits)"
    - "programs/avenir/src/instructions/cast_vote.rs"
    - "programs/avenir/src/instructions/mpc/init_dispute_tally_comp_def.rs"
    - "programs/avenir/src/instructions/mpc/init_dispute_tally.rs"
    - "programs/avenir/src/instructions/mpc/init_dispute_tally_callback.rs"
    - "programs/avenir/src/instructions/mpc/add_dispute_vote_comp_def.rs"
    - "programs/avenir/src/instructions/mpc/add_dispute_vote.rs"
    - "programs/avenir/src/instructions/mpc/add_dispute_vote_callback.rs"
  modified:
    - "programs/avenir/src/instructions/mpc/mod.rs"
    - "programs/avenir/src/instructions/mod.rs"
    - "programs/avenir/src/lib.rs"
    - "programs/avenir/src/errors.rs"

key-decisions:
  - "Scoped mutable borrow of dispute to satisfy borrow checker before queue_computation call"
  - "VoteInput struct with single is_yes bool field (stake weight passed as plaintext_u64)"

patterns-established:
  - "Dispute MPC callback pattern: write tally ciphertexts + clear mpc_lock on both success and failure"
  - "Juror vote bitfield enforcement: votes_submitted |= 1 << juror_index"

requirements-completed: [RES-05]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 8 Plan 3: Encrypted Voting MPC Summary

**Arcium MPC circuits (init_dispute_tally, add_dispute_vote) with stake-weighted encrypted vote accumulation and cast_vote juror instruction**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T11:30:10Z
- **Completed:** 2026-03-04T11:35:54Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Two new Arcium MPC circuits: init_dispute_tally (encrypted zeros) and add_dispute_vote (stake-weighted accumulation)
- Complete MPC queue/callback infrastructure mirroring init_pool/update_pool patterns
- cast_vote instruction enforcing juror eligibility, one-vote bitfield, voting window, and MPC lock with 60s timeout
- VoteTotals type and VoteInput struct in encrypted-ixs crate

## Task Commits

Each task was committed atomically:

1. **Task 1: Add init_dispute_tally and add_dispute_vote circuits to encrypted-ixs** - `042d77e` (feat)
2. **Task 2: Implement MPC queue/callback infrastructure and cast_vote instruction** - `587eb3f` (feat)

## Files Created/Modified
- `encrypted-ixs/src/lib.rs` - VoteTotals, VoteInput types + init_dispute_tally, add_dispute_vote circuits
- `programs/avenir/src/instructions/cast_vote.rs` - Juror vote submission with encryption + MPC queue
- `programs/avenir/src/instructions/mpc/init_dispute_tally_comp_def.rs` - Register init_dispute_tally circuit
- `programs/avenir/src/instructions/mpc/init_dispute_tally.rs` - Queue init_dispute_tally MPC computation
- `programs/avenir/src/instructions/mpc/init_dispute_tally_callback.rs` - Write encrypted zeros to DisputeTally
- `programs/avenir/src/instructions/mpc/add_dispute_vote_comp_def.rs` - Register add_dispute_vote circuit
- `programs/avenir/src/instructions/mpc/add_dispute_vote.rs` - Queue add_dispute_vote MPC computation
- `programs/avenir/src/instructions/mpc/add_dispute_vote_callback.rs` - Write updated tally, clear mpc_lock
- `programs/avenir/src/instructions/mpc/mod.rs` - Added 6 new module declarations and re-exports
- `programs/avenir/src/instructions/mod.rs` - Added cast_vote module
- `programs/avenir/src/lib.rs` - Added entrypoints + arcium_callback handlers for dispute voting
- `programs/avenir/src/errors.rs` - Added NotSelectedJuror, AlreadyVoted, VotingWindowClosed, DisputeNotVoting

## Decisions Made
- Scoped mutable borrow of dispute account to satisfy Rust borrow checker before passing ctx.accounts to queue_computation (same pattern as place_bet)
- VoteInput struct uses single is_yes bool -- stake weight passed as plaintext_u64 since it's public on the Resolver account
- add_dispute_vote_callback clears mpc_lock on both success AND failure paths (prevents permanent dispute lockout)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed borrow checker conflict in cast_vote handler**
- **Found during:** Task 2 (cast_vote implementation)
- **Issue:** Mutable borrow of ctx.accounts.dispute overlapped with immutable borrow of ctx.accounts for queue_computation
- **Fix:** Used scoped block to perform all dispute mutations, extract Copy values, then drop mutable borrow before queue_computation call
- **Files modified:** programs/avenir/src/instructions/cast_vote.rs
- **Verification:** anchor build succeeds
- **Committed in:** 587eb3f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Standard Rust borrow checker pattern, no scope creep.

## Issues Encountered
None beyond the borrow checker fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Encrypted voting infrastructure complete -- jurors can submit encrypted votes via cast_vote
- Ready for Plan 04 (reveal_dispute_tally MPC) to decrypt and resolve dispute outcomes
- Ready for Plan 05 (dispute settlement) to handle quorum checking and outcome enforcement

---
*Phase: 08-dispute-system*
*Completed: 2026-03-04*
