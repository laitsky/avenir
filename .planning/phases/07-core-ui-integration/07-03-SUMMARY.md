---
phase: 07-core-ui-integration
plan: 03
subsystem: ui
tags: [solana, anchor, websocket, encryption, bet-placement, resolution, claim, fog-reveal, tanstack-query]

# Dependency graph
requires:
  - phase: 07-core-ui-integration
    provides: "Wallet adapter, Anchor hooks, PDA helpers, types, encryption wrapper (Plan 01); useMarkets, useUsdcBalance, homepage adaptation (Plan 02)"
  - phase: 05-encrypted-betting
    provides: "place_bet instruction with encrypted pool update via MPC"
  - phase: 06-resolution-payouts
    provides: "resolve_market, compute_payouts, claim_payout instructions"
provides:
  - "useMarket hook with websocket subscription for real-time single market updates"
  - "useUserPosition hook for per-user position with null fallback"
  - "usePlaceBet hook with encrypt -> submit -> confirm flow, step tracking, MPC lock retry"
  - "useResolveMarket, useComputePayouts, useClaimPayout transaction hooks"
  - "BetPlacement panel mode state machine (bet, resolve, reveal-payouts, claim-payout, lost, claimed, resolved-no-position, expired)"
  - "Market detail page with live on-chain data, fog-wrapped sentiment, real-time websocket"
  - "Multi-step progress indicator for bet transaction flow"
  - "Wallet intercept opening modal when disconnected user clicks bet"
affects: [09-portfolio-search]

# Tech tracking
tech-stack:
  added: []
  patterns: [panel mode state machine for bet/resolve/claim lifecycle, websocket subscription invalidation for real-time query updates, exponential backoff retry for MPC lock contention]

key-files:
  created:
    - app/src/hooks/useMarket.ts
    - app/src/hooks/useUserPosition.ts
    - app/src/hooks/usePlaceBet.ts
    - app/src/hooks/useResolveMarket.ts
    - app/src/hooks/useComputePayouts.ts
    - app/src/hooks/useClaimPayout.ts
  modified:
    - app/src/routes/market/$id.tsx
    - app/src/components/market/MarketDetail.tsx
    - app/src/components/market/BetPlacement.tsx
    - app/vite.config.ts

key-decisions:
  - "getBetPanelMode state machine drives all BetPlacement UI modes based on market state, position, and wallet"
  - "@arcium-hq/client externalized from client bundle via rollupOptions.external due to Node.js crypto dependency"
  - "Websocket subscriptions on both market and position PDAs for real-time updates after MPC callbacks"
  - "Exponential backoff retry (2s, 4s, 8s, 16s, 32s) for MPC lock contention with max 5 attempts"
  - "Fee estimate uses 200 bps (2%) for claim payout display -- approximate, actual fee from config"

patterns-established:
  - "Panel mode state machine: getBetPanelMode(market, position, wallet) returns mode string driving component switch"
  - "Arcium accounts derived via dynamic import of @arcium-hq/client at call time (not at module load)"
  - "Bet progress stepper: BetStep enum tracks encrypt->submit->confirm flow for UI rendering"

requirements-completed: [UX-02]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 7 Plan 3: Market Detail with Live Data, Bet Flow, Resolution/Claim UI Summary

**Live market detail page with websocket-updated on-chain data, encrypted bet placement with multi-step progress, and full resolution/claim lifecycle UI via panel mode state machine**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T09:29:21Z
- **Completed:** 2026-03-04T09:35:02Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- 6 hooks created covering the full market detail data and transaction layer (useMarket, useUserPosition, usePlaceBet, useResolveMarket, useComputePayouts, useClaimPayout)
- Market detail page shows live on-chain data with real-time websocket subscription for instant updates
- BetPlacement implements 8-mode panel state machine covering the complete market lifecycle: betting, resolution, payout reveal, claim, loss, already-claimed, no-position, and expired
- Multi-step progress indicator shows Encrypting -> Submitting -> Confirming flow with MPC lock retry feedback
- Wallet intercept opens connect modal when disconnected user attempts to place a bet

## Task Commits

Each task was committed atomically:

1. **Task 1: Create data hooks and transaction hooks** - `bd13e7d` (feat)
2. **Task 2: Adapt market detail page, MarketDetail, and BetPlacement** - `c85eb9c` (feat)

## Files Created/Modified
- `app/src/hooks/useMarket.ts` - Single market fetch with websocket subscription for real-time updates
- `app/src/hooks/useUserPosition.ts` - User position fetch with null fallback and websocket sub
- `app/src/hooks/usePlaceBet.ts` - Full bet flow with encryption, progress tracking, retry logic
- `app/src/hooks/useResolveMarket.ts` - Market resolution mutation for creators
- `app/src/hooks/useComputePayouts.ts` - Permissionless compute_payouts with Arcium account derivation
- `app/src/hooks/useClaimPayout.ts` - Claim payout with config-derived fee recipient
- `app/src/routes/market/$id.tsx` - Uses useMarket/useUserPosition instead of MOCK_MARKETS, fog loading state
- `app/src/components/market/MarketDetail.tsx` - OnChainMarket props, fog-wrapped sentiment, finalization detection
- `app/src/components/market/BetPlacement.tsx` - 8-mode panel state machine with bet/resolve/claim flows
- `app/vite.config.ts` - @arcium-hq/client externalized from client bundle

## Decisions Made
- **Panel mode state machine:** getBetPanelMode(market, position, wallet) computes the correct UI mode from on-chain state. This is a pure function that cleanly maps the market lifecycle to component rendering.
- **@arcium-hq/client externalization:** The Arcium SDK depends on Node.js crypto which breaks Vite's browser build. Externalizing it via rollupOptions ensures it's only loaded at runtime via dynamic import.
- **Websocket on both market and position PDAs:** Market PDA subscription catches state changes (resolution, MPC lock), while position PDA subscription catches bet callback updates.
- **Exponential backoff retry:** 2s base delay doubling up to 5 attempts for MPC lock contention, matching the Phase 5 sequential lock pattern.
- **Approximate fee display:** Claim payout UI estimates 2% fee (200 bps) for display. Actual fee is deducted on-chain from the config account.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Externalized @arcium-hq/client from Vite client build**
- **Found during:** Task 2 (build verification)
- **Issue:** @arcium-hq/client imports Node.js crypto module statically, causing Rollup to fail with "randomBytes is not exported by __vite-browser-external"
- **Fix:** Added `build.rollupOptions.external: ['@arcium-hq/client']` to vite.config.ts
- **Files modified:** app/vite.config.ts
- **Verification:** `bun run build` completes successfully
- **Committed in:** c85eb9c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for build to succeed. @arcium-hq/client is only used at runtime via dynamic import, so externalizing it from the bundle is correct.

## Issues Encountered

- Task 2 commit was captured by parallel 07-02 executor due to concurrent execution -- changes verified present in commit c85eb9c. No work was lost.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 7 is now complete -- all 3 plans finished
- Market feed (Plan 02) and market detail (Plan 03) use live on-chain data
- Wallet connection, bet placement, resolution, and claim flows are functional
- Ready for Phase 8 (Dispute System) and Phase 9 (Portfolio & Search) to begin in parallel
- Phase 9 can build on useUserPosition hook for portfolio position display

## Self-Check: PASSED

All 10 created/modified files verified present. Both task commits (bd13e7d, c85eb9c) verified in git log.

---
*Phase: 07-core-ui-integration*
*Completed: 2026-03-04*
