---
phase: 04-design-system-fog
plan: 02
subsystem: ui
tags: [react, tailwind, cva, fog, market-card, mock-data, countdown]

# Dependency graph
requires:
  - phase: 04-design-system-fog/01
    provides: FogOverlay component and forest/fog design tokens
provides:
  - MockMarket typed interface and 10 diverse mock markets
  - MarketCard component with dual fog overlays (light sentiment, heavy pool total)
  - CountdownTimer component with urgency styling
affects: [04-design-system-fog/03, 04-design-system-fog/04, 07-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [CVA card variants for status-based styling, FogOverlay composition for encrypted data areas]

key-files:
  created:
    - app/src/lib/mock-data.ts
    - app/src/components/market/MarketCard.tsx
    - app/src/components/market/CountdownTimer.tsx
  modified: []

key-decisions:
  - "10 mock markets covering all 5 categories with 2 resolved (yes/no) for comprehensive dev data"
  - "CountdownTimer uses 1s interval with urgency threshold at <1h (destructive-foreground color)"
  - "CVA card variants split live vs resolved states (hover border vs dimmed opacity)"

patterns-established:
  - "Market component directory: app/src/components/market/ for all market-related composed components"
  - "Mock data module exports both type and data array for co-located test/dev data"
  - "Dual FogOverlay per card: light density for partial info, heavy density for encrypted amounts"

requirements-completed: [UX-06]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 4 Plan 2: Market Card & Mock Data Summary

**MarketCard component with dual FogOverlay composition (light on sentiment, heavy on pool totals) plus 10 diverse mock markets and countdown timer**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T16:06:34Z
- **Completed:** 2026-03-03T16:08:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- MockMarket interface with 10 diverse markets across all 5 categories (Politics, Crypto, Sports, Culture, Economics)
- MarketCard renders all 6 content elements: category badge, countdown, question, fogged sentiment, fogged pool total, bet count/outcome badge, and quick-bet buttons
- CountdownTimer with adaptive display format (days/hours/minutes/seconds) and urgency styling under 1 hour
- Resolved market cards show cleared fog with green "Yes won" / red "No won" outcome badges

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mock market data module and CountdownTimer component** - `56d1fdd` (feat)
2. **Task 2: Create MarketCard component with fog overlays** - `ed0b33c` (feat)

## Files Created/Modified
- `app/src/lib/mock-data.ts` - MockMarket interface and MOCK_MARKETS array with 10 entries (all 5 categories, 8 live + 2 resolved, varied sentiments/pools)
- `app/src/components/market/CountdownTimer.tsx` - Countdown display with 1s tick, adaptive format (Xd Xh / Xh Xm / Xm Xs / Ended), urgency color under 1h
- `app/src/components/market/MarketCard.tsx` - Primary market card with CVA variants, dual FogOverlay sections, category badge, bet count, quick-bet buttons

## Decisions Made
- 10 mock markets (not just minimum 8) to provide richer dev data variety with better category distribution
- CountdownTimer urgency threshold set at 1 hour -- matches context spec, uses destructive-foreground for visual alarm
- Card variants use CVA with status-based differentiation (live gets hover border effect, resolved gets reduced opacity)
- Pool totals range from 680 USDC to 52,800 USDC and bet counts from 15 to 421 for realistic visual testing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- MarketCard ready for use in homepage feed grid (Plan 03)
- Mock data available for all page layouts and components
- CountdownTimer reusable for market detail page as well

## Self-Check: PASSED

All 3 created files verified on disk. Both task commits (56d1fdd, ed0b33c) found in git log.

---
*Phase: 04-design-system-fog*
*Completed: 2026-03-03*
