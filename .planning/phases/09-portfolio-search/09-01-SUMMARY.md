---
phase: 09-portfolio-search
plan: 01
subsystem: ui
tags: [react, tanstack-query, anchor, solana, fog-overlay, portfolio]

# Dependency graph
requires:
  - phase: 07-core-ui-integration
    provides: useMarkets, FogOverlay, CountdownTimer, Button, anchor program access
  - phase: 06-resolution-payouts
    provides: useClaimPayout hook for winner claim transactions
  - phase: 05-encrypted-betting
    provides: OnChainPosition type and UserPosition on-chain account
provides:
  - useUserPositions hook with EnrichedPosition type for all wallet positions
  - Full portfolio page with Active/Claimable/History sections and inline claim
affects: [09-02-search, 09-03-mobile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - memcmp filter on Anchor account fetch (offset 16 for user pubkey after discriminator+market_id)
    - EnrichedPosition join pattern: position + market data via market ID map
    - Sub-component per claimable position for separate useClaimPayout instances

key-files:
  created:
    - app/src/hooks/useUserPositions.ts
    - app/src/routes/portfolio.tsx
  modified: []

key-decisions:
  - "memcmp offset 16 for user pubkey: discriminator (8 bytes) + market_id (i64, 8 bytes) = 16"
  - "Client-side fallback included if memcmp offset produces no results"
  - "ClaimablePositionCard as separate sub-component so each card gets its own useClaimPayout instance"
  - "Active covers states 0/1/2/3 (non-finalized); only state 4 triggers Claimable/History split"
  - "Estimated payout shown as ~XX.XX USDC (tilde = estimate) using revealedYesPool/revealedNoPool"

patterns-established:
  - "EnrichedPosition join: fetch positions with filter, fetch all markets, build ID map, join"
  - "Portfolio categorization: finalized+winner+unclaimed=Claimable, else Finalized=History, else Active"

requirements-completed: [UX-04]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 9 Plan 01: Portfolio Page Summary

**useUserPositions hook with memcmp wallet filter plus three-section portfolio UI (Active/Claimable/History) with fog-wrapped encrypted payouts and inline one-click claim**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T01:43:33Z
- **Completed:** 2026-03-05T01:45:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- useUserPositions hook fetches all positions for the connected wallet using Anchor memcmp filter (offset 16), enriches each with market data via ID join, auto-polls every 20s
- Full portfolio page replaces the shell with summary bar (active count, total staked, winnings claimed), three categorized sections, and all required empty states
- Claimable positions have inline Claim button via ClaimablePositionCard sub-component calling useClaimPayout(marketId) -- no navigation needed to collect winnings
- Active positions display fog-wrapped "Encrypted" payout maintaining the app's encrypted-data visual language
- History shows claimed positions (green badge) and losses at opacity-60 with "Lost" badge, sorted by resolution time

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useUserPositions hook with market enrichment** - `6fc1d00` (feat)
2. **Task 2: Build full portfolio page with Active/Claimable/History sections** - `8fcb350` (feat)

## Files Created/Modified
- `app/src/hooks/useUserPositions.ts` - Hook fetching all UserPosition accounts for connected wallet, enriched with market data via ID join
- `app/src/routes/portfolio.tsx` - Full portfolio page with summary bar, three sections, empty states, fog loading

## Decisions Made
- memcmp offset 16 chosen based on account layout: discriminator (8 bytes) + market_id (i64, 8 bytes) = 16 bytes before user Pubkey field
- Client-side fallback included for robustness if memcmp offset produces incorrect results
- ClaimablePositionCard must be a separate sub-component -- React hook rules prevent calling useClaimPayout(marketId) in a loop from the parent
- Active state covers market states 0/1/2/3 (all non-finalized); only state 4 triggers Claimable vs History split based on winner/claimed status
- Estimated payout uses revealedYesPool/revealedNoPool from the Finalized market, applying 2% fee deduction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Portfolio page complete and wired to on-chain data; ready for phase 9 remaining plans
- Plan 02 (search) can add search bar to Header.tsx independently
- Plan 03 (mobile) responsive pass can update portfolio card layout for single-column mobile

## Self-Check: PASSED

- app/src/hooks/useUserPositions.ts: FOUND
- app/src/routes/portfolio.tsx: FOUND
- .planning/phases/09-portfolio-search/09-01-SUMMARY.md: FOUND
- Commit 6fc1d00 (Task 1): FOUND
- Commit 8fcb350 (Task 2): FOUND

---
*Phase: 09-portfolio-search*
*Completed: 2026-03-05*
