---
phase: 07-core-ui-integration
plan: 02
subsystem: ui
tags: [tanstack-query, solana, data-fetching, on-chain, usdc-balance, market-feed, polling]

# Dependency graph
requires:
  - phase: 07-core-ui-integration
    plan: 01
    provides: "Anchor hooks (useReadOnlyProgram), OnChainMarket type, CATEGORY_MAP, SENTIMENT_MAP, constants, WalletButton"
  - phase: 04-design-system-fog
    provides: "MarketCard, MarketGrid, CategoryTabs, FogOverlay, CountdownTimer components"
provides:
  - "useMarkets hook fetching all on-chain Market accounts with 20s auto-poll"
  - "useUsdcBalance hook fetching connected wallet USDC ATA balance with 30s auto-poll"
  - "Homepage displaying live on-chain markets with category filtering and sorting"
  - "Fog-themed loading state for first page load"
  - "WalletButton showing live USDC balance when wallet connected"
affects: [07-03, 09-portfolio-search]

# Tech tracking
tech-stack:
  added: []
  patterns: [TanStack Query polling hooks for on-chain data, sentiment-to-percent visual mapping for encrypted pools]

key-files:
  created:
    - app/src/hooks/useMarkets.ts
    - app/src/hooks/useUsdcBalance.ts
  modified:
    - app/src/components/wallet/WalletButton.tsx
    - app/src/routes/index.tsx
    - app/src/components/layout/MarketGrid.tsx
    - app/src/components/market/MarketCard.tsx
    - app/src/components/layout/CategoryTabs.tsx

key-decisions:
  - "sentimentToPercent maps sentiment enum to visual-only bar percentages (65/50/35) since actual pool data is encrypted"
  - "Featured market card shows resolutionSource as description since OnChainMarket has no description field"
  - "CategoryTabs imports CATEGORIES from lib/constants for single source of truth"
  - "Fog overlay shows 'Encrypted' text for live market pool totals instead of fake numbers"

patterns-established:
  - "Data fetching hooks in app/src/hooks/ directory using TanStack Query with useReadOnlyProgram"
  - "sentimentToPercent helper for visual sentiment bar from encrypted on-chain data"
  - "State-based checks: isLive (state 0|1), isResolved (state 2|4), isFinalized (state 4)"

requirements-completed: [UX-01]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 7 Plan 2: Live Market Feed Summary

**TanStack Query data fetching hooks with 20s auto-poll, homepage adapted from MockMarket to OnChainMarket with fog-themed loading, category filtering, and USDC balance display**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T09:28:57Z
- **Completed:** 2026-03-04T09:31:58Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- useMarkets hook fetches all Market accounts via program.account.market.all() with 20s auto-poll using read-only program
- useUsdcBalance hook fetches connected wallet's USDC ATA balance with 30s auto-poll
- Homepage fully adapted from MockMarket to OnChainMarket with fog-themed loading state, error state, and empty state
- MarketCard renders on-chain fields: CATEGORY_MAP for category, SENTIMENT_MAP for sentiment, state-based resolved/live checks
- MarketGrid sorts by totalBets (trending), createdAt (newest), resolutionTime (ending soon) using on-chain data
- WalletButton shows live USDC balance in connected state (e.g. "8xK3...mP9q . 142.50 USDC")
- CategoryTabs imports CATEGORIES from constants for single source of truth

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useMarkets and useUsdcBalance hooks** - `b75c52a` (feat)
2. **Task 2: Adapt homepage components to OnChainMarket type** - `4094659` (feat)

## Files Created/Modified
- `app/src/hooks/useMarkets.ts` - TanStack Query hook fetching all Market accounts with 20s auto-poll
- `app/src/hooks/useUsdcBalance.ts` - TanStack Query hook fetching user USDC ATA balance with 30s auto-poll
- `app/src/components/wallet/WalletButton.tsx` - Added useUsdcBalance import and live balance display
- `app/src/routes/index.tsx` - Replaced MOCK_MARKETS with useMarkets() hook, added loading/error/empty states
- `app/src/components/layout/MarketGrid.tsx` - Changed from MockMarket[] to OnChainMarket[] with updated sort functions
- `app/src/components/market/MarketCard.tsx` - Changed from MockMarket to OnChainMarket with CATEGORY_MAP, SENTIMENT_MAP, state checks
- `app/src/components/layout/CategoryTabs.tsx` - Imports CATEGORIES from lib/constants instead of local array

## Decisions Made
- **sentimentToPercent visual mapping:** Maps sentiment enum to approximate bar percentages (LeaningYes=65%, Even=50%, LeaningNo=35%, Unknown=50%) since actual pool totals are encrypted. These are visual-only hints, not real probabilities.
- **Featured market description:** Shows resolutionSource instead of description since OnChainMarket has no description field (on-chain storage is minimal).
- **Pool total display:** Live markets show "Encrypted" text behind fog overlay instead of fabricated numbers. Finalized markets show actual revealed pool totals in USDC.
- **CategoryTabs single source of truth:** Imports CATEGORIES from lib/constants rather than maintaining a separate local array, ensuring consistency with all category-related code.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Homepage is fully wired to on-chain data with auto-polling
- Data fetching hooks pattern established for Plan 03 (market detail page, bet placement)
- useMarkets and useUsdcBalance hooks available for reuse in other views
- mock-data.ts preserved for market/$id.tsx until Plan 03 updates it

---
*Phase: 07-core-ui-integration*
*Completed: 2026-03-04*
