---
phase: 12-pool-init-encryption-hardening
plan: 01
subsystem: ui
tags: [react, arcium, mpc, solana, websocket, tanstack-query]

# Dependency graph
requires:
  - phase: 03-arcium-mpc-core
    provides: init_pool on-chain instruction and callback
  - phase: 07-core-ui-integration
    provides: BetPlacement state machine, useMarket WebSocket pattern, Arcium account derivation
  - phase: 11-wire-dispute-frontend-hooks
    provides: useOpenDispute multi-TX chaining pattern
provides:
  - useCreateMarket hook chaining create_market + init_pool with partial-success recovery
  - useMarketPool hook with WebSocket subscription for pool init detection
  - isPoolInitialized helper for checking MarketPool ciphertext state
  - pool-initializing gate in BetPlacement (13th PanelMode)
affects: [12-02-nonce-fix, market-creation-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-tx-chaining-with-init-pool, pool-initialization-gate-pattern]

key-files:
  created:
    - app/src/hooks/useCreateMarket.ts
    - app/src/hooks/useMarketPool.ts
  modified:
    - app/src/components/market/BetPlacement.tsx

key-decisions:
  - "CreateMarketParams uses IDL-actual fields (question, resolutionSource, category, resolutionTime) not plan-specified fields that included non-existent description and minBet"
  - "poolReady defaults to true before data arrives to avoid flashing pool-initializing gate on already-initialized markets"
  - "Recovery init_pool button appears after 30s timeout matching CONTEXT.md recommendation"

patterns-established:
  - "Pool initialization gate: check MarketPool ciphertext for all-zeros to detect uninitialized state"
  - "Multi-TX hook with partial-success tracking: marketCreated flag skips create_market on retry"

requirements-completed: [BET-01, BET-02]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 12 Plan 01: Pool Init & BetPlacement Gate Summary

**useCreateMarket hook auto-chains create_market + init_pool with 3x retry, plus pool-initializing UI gate with 30s recovery button in BetPlacement**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T16:20:49Z
- **Completed:** 2026-03-04T16:24:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- useCreateMarket hook chains create_market + init_pool as sequential TXs with partial-success tracking
- useMarketPool hook fetches MarketPool PDA data with WebSocket subscription for real-time init detection
- BetPlacement extended to 13 PanelMode values with pool-initializing gate blocking bets on uninitialized pools
- PoolInitializingMode shows spinner with recovery button after 30s timeout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCreateMarket hook and useMarketPool hook** - `34623d3` (feat)
2. **Task 2: Add pool-initializing gate to BetPlacement state machine** - `7469369` (feat)

## Files Created/Modified
- `app/src/hooks/useCreateMarket.ts` - Multi-TX hook chaining create_market + init_pool with partial-success recovery
- `app/src/hooks/useMarketPool.ts` - MarketPool data hook with WebSocket subscription and isPoolInitialized helper
- `app/src/components/market/BetPlacement.tsx` - Added pool-initializing PanelMode with PoolInitializingMode component

## Decisions Made
- Used actual IDL CreateMarketParams fields (question, resolutionSource, category, resolutionTime) -- plan mentioned description and minBet which do not exist in the IDL
- Pool readiness defaults to true before data arrives to avoid flashing the initializing gate on markets that are already initialized
- Recovery button uses the same Arcium account derivation pattern as useCreateMarket (inline async function, no separate hook)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected CreateMarketParams fields to match IDL**
- **Found during:** Task 1 (useCreateMarket hook)
- **Issue:** Plan specified description, minBet fields in CreateMarketInput but actual IDL CreateMarketParams only has question, resolutionSource, category, resolutionTime
- **Fix:** Used actual IDL fields for CreateMarketInput interface
- **Files modified:** app/src/hooks/useCreateMarket.ts
- **Verification:** Build passes with correct types
- **Committed in:** 34623d3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correction -- using non-existent IDL fields would cause compilation errors.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pool initialization gate is live -- new markets will auto-init pool via useCreateMarket
- Plan 02 (nonce fix in encryption.ts) can proceed independently
- WebSocket-based pool detection means no polling overhead

---
*Phase: 12-pool-init-encryption-hardening*
*Completed: 2026-03-04*
