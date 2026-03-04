---
phase: 08-dispute-system
plan: 01
subsystem: on-chain
tags: [anchor, solana, resolver, staking, dispute, pda]

# Dependency graph
requires:
  - phase: 06-resolution-payouts
    provides: resolve_market instruction, Market state account, AvenirError enum
provides:
  - Resolver PDA with stake, approval, cooldown, and active_disputes fields
  - ResolverRegistry singleton PDA with bounded Vec<Pubkey> (max 64)
  - register_resolver instruction (self-registration with >= 500 USDC stake)
  - approve_resolver instruction (admin approval, adds to registry)
  - stake_resolver instruction (top-up stake for approved resolvers)
  - withdraw_resolver instruction (two-phase withdrawal with 7-day cooldown)
  - 48h grace period enforcement on resolve_market
  - 9 new error variants for resolver/dispute validation
affects: [08-02, 08-03, 08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-phase-withdrawal, bounded-registry-pda, grace-period-enforcement]

key-files:
  created:
    - programs/avenir/src/state/resolver.rs
    - programs/avenir/src/state/resolver_registry.rs
    - programs/avenir/src/instructions/register_resolver.rs
    - programs/avenir/src/instructions/approve_resolver.rs
    - programs/avenir/src/instructions/stake_resolver.rs
    - programs/avenir/src/instructions/withdraw_resolver.rs
  modified:
    - programs/avenir/src/state/mod.rs
    - programs/avenir/src/instructions/mod.rs
    - programs/avenir/src/instructions/resolve_market.rs
    - programs/avenir/src/errors.rs
    - programs/avenir/src/lib.rs

key-decisions:
  - "Resolver vault uses PDA authority (Resolver account) for secure token transfers"
  - "ResolverRegistry uses init_if_needed to create on first approval"
  - "Two-phase withdrawal pattern: request then execute after 7-day cooldown"
  - "Full withdrawal (stake=0) auto-revokes approval and removes from registry"

patterns-established:
  - "Two-phase withdrawal: request sets timestamp+amount, execute validates cooldown and transfers"
  - "Bounded registry PDA: Vec<Pubkey> with MAX_RESOLVERS cap for on-chain iteration"
  - "Grace period enforcement: resolution_time + 172800s window for creator resolution"

requirements-completed: [RES-02, RES-04]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 8 Plan 1: Resolver Pool Staking Summary

**Resolver pool with staking lifecycle (register/approve/stake/withdraw), bounded registry PDA, and 48h grace period on market resolution**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T11:18:39Z
- **Completed:** 2026-03-04T11:21:20Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Resolver PDA with stake tracking, approval status, cooldown fields, and active dispute counter
- ResolverRegistry singleton with bounded Vec<Pubkey> (max 64) for juror selection
- Full staking lifecycle: register (500 USDC min), admin approve, top-up stake, two-phase withdrawal
- 48h grace period enforcement on resolve_market (creator must resolve within window or market goes to dispute)
- 9 new error variants covering all resolver/dispute validation paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Resolver and ResolverRegistry state accounts** - `ca32000` (feat)
2. **Task 2: Implement resolver staking instructions and update resolve_market** - `6c7255b` (feat)

## Files Created/Modified
- `programs/avenir/src/state/resolver.rs` - Resolver PDA account struct with stake, approval, cooldown fields
- `programs/avenir/src/state/resolver_registry.rs` - ResolverRegistry singleton with bounded resolver list
- `programs/avenir/src/state/mod.rs` - Added resolver and resolver_registry module exports
- `programs/avenir/src/instructions/register_resolver.rs` - Self-registration with USDC stake transfer
- `programs/avenir/src/instructions/approve_resolver.rs` - Admin approval with registry addition
- `programs/avenir/src/instructions/stake_resolver.rs` - Stake top-up for approved resolvers
- `programs/avenir/src/instructions/withdraw_resolver.rs` - Two-phase withdrawal with 7-day cooldown
- `programs/avenir/src/instructions/resolve_market.rs` - Added 48h grace period check
- `programs/avenir/src/instructions/mod.rs` - Added 4 new instruction module declarations
- `programs/avenir/src/errors.rs` - Added 9 resolver/dispute error variants
- `programs/avenir/src/lib.rs` - Added 4 new instruction entrypoints

## Decisions Made
- Resolver vault uses Resolver PDA as token authority (consistent with market vault pattern)
- ResolverRegistry uses init_if_needed to lazily create on first approval rather than separate init instruction
- Two-phase withdrawal pattern: request sets timestamp and amount, execute validates 7-day cooldown then transfers
- Full withdrawal (staked_amount reaches 0) automatically revokes approval and removes from registry via swap_remove

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Resolver and ResolverRegistry state accounts ready for dispute filing (08-02)
- Staking lifecycle complete -- resolvers can register, be approved, and manage stake
- Grace period enforcement enables dispute escalation path after 48h window
- Error variants ready for use in dispute filing, juror assignment, and voting instructions

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (ca32000, 6c7255b) verified in git log. Anchor build succeeds. IDL contains all 4 new instructions and both new account types.

---
*Phase: 08-dispute-system*
*Completed: 2026-03-04*
