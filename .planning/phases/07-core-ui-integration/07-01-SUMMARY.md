---
phase: 07-core-ui-integration
plan: 01
subsystem: ui
tags: [solana, wallet-adapter, anchor, tanstack-query, encryption, pda, ssr]

# Dependency graph
requires:
  - phase: 04-design-system-fog
    provides: "Header, MarketCard, FogOverlay components with dark theme and #/ alias"
  - phase: 03-arcium-mpc-core
    provides: "IDL, on-chain program, Arcium encryption patterns (x25519, RescueCipher)"
provides:
  - "Wallet connection via Solana wallet adapter (Phantom, Solflare, Backpack auto-detected)"
  - "TanStack Query configured with SSR integration and 15s staleTime"
  - "Typed Anchor program hooks (useAnchorProgram, useReadOnlyProgram)"
  - "PDA derivation helpers (market, pool, vault, position, config)"
  - "OnChainMarket/OnChainPosition types with BN-to-number mapping helpers"
  - "Browser-safe Arcium encryption wrapper (encryptBetForMPC)"
  - "WalletButton component with connected state dropdown"
  - "Sonner Toaster for toast notifications"
affects: [07-02, 07-03, 09-portfolio-search]

# Tech tracking
tech-stack:
  added: [@solana/wallet-adapter-react, @solana/wallet-adapter-react-ui, @solana/wallet-adapter-base, @solana/spl-token, sonner]
  patterns: [ClientOnly SSR guard for wallet-dependent UI, read-only Anchor program for unauthenticated fetching, dynamic import for browser-uncertain libraries]

key-files:
  created:
    - app/src/lib/constants.ts
    - app/src/lib/types.ts
    - app/src/lib/pda.ts
    - app/src/lib/anchor.ts
    - app/src/lib/encryption.ts
    - app/src/lib/idl/avenir.json
    - app/src/lib/idl/avenir.ts
    - app/src/components/wallet/WalletButton.tsx
  modified:
    - app/package.json
    - app/src/router.tsx
    - app/src/routes/__root.tsx
    - app/src/components/Header.tsx

key-decisions:
  - "ClientOnly wraps entire wallet provider tree in __root.tsx (not just individual components) to prevent SSR hydration mismatch"
  - "wallets={[]} enables Wallet Standard auto-detection -- no per-wallet adapter packages needed for Phantom/Solflare/Backpack"
  - "useReadOnlyProgram provides Anchor access without wallet for unauthenticated market data fetching"
  - "encryptBetForMPC uses dynamic import for @arcium-hq/client to gracefully handle potential browser incompatibility"
  - "FallbackLayout renders same visual structure during SSR to prevent layout shift"

patterns-established:
  - "ClientOnly SSR guard: wallet-dependent UI wrapped in ClientOnly with static fallback"
  - "Read-only Anchor: useReadOnlyProgram for data fetching without wallet connection"
  - "PDA helpers: centralized derivation in pda.ts matching on-chain seeds exactly"
  - "Type mapping: mapMarketAccount/mapPositionAccount as single BN-to-number conversion point"

requirements-completed: [UX-03]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 7 Plan 1: Wallet & Integration Foundation Summary

**Solana wallet adapter with Wallet Standard auto-detection, TanStack Query SSR integration, typed Anchor program hooks, PDA derivation helpers, and browser-safe Arcium encryption wrapper**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T09:21:04Z
- **Completed:** 2026-03-04T09:25:29Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Wallet connection works with Phantom, Solflare, and Backpack via Wallet Standard auto-detection (empty wallets array)
- TanStack Query configured with 15s staleTime and SSR integration via setupRouterSsrQueryIntegration
- Full integration foundation layer: Anchor hooks, PDA helpers, type mappings, encryption wrapper, constants
- WalletButton with connected state dropdown (copy address, Solscan link, disconnect)
- No SSR hydration issues -- wallet providers and wallet-dependent UI wrapped in ClientOnly

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, copy IDL, create lib foundation files** - `8248bec` (feat)
2. **Task 2: Wire providers into app root, create WalletButton with dropdown, update Header** - `cea8859` (feat)

## Files Created/Modified
- `app/src/lib/constants.ts` - PROGRAM_ID, USDC_MINT, RPC_ENDPOINT, CATEGORIES exports
- `app/src/lib/types.ts` - OnChainMarket, OnChainPosition interfaces, CATEGORY_MAP, SENTIMENT_MAP, STATE_MAP, mapMarketAccount, mapPositionAccount
- `app/src/lib/pda.ts` - 5 PDA derivation helpers (getMarketPda, getMarketPoolPda, getVaultPda, getPositionPda, getConfigPda)
- `app/src/lib/anchor.ts` - useAnchorProgram (wallet-connected) and useReadOnlyProgram (no wallet) hooks
- `app/src/lib/encryption.ts` - Browser-safe encryptBetForMPC wrapper with dynamic import
- `app/src/lib/idl/avenir.json` - IDL JSON copied from target/idl/
- `app/src/lib/idl/avenir.ts` - TypeScript type copied from target/types/
- `app/src/components/wallet/WalletButton.tsx` - Wallet connect button with connected state dropdown
- `app/package.json` - Added wallet-adapter, spl-token, sonner dependencies
- `app/src/router.tsx` - QueryClient with SSR integration
- `app/src/routes/__root.tsx` - Wallet providers, ConnectionProvider, Toaster inside ClientOnly
- `app/src/components/Header.tsx` - WalletButton replaces placeholder button

## Decisions Made
- **ClientOnly wraps entire provider tree:** Wrapping ConnectionProvider + WalletProvider + WalletModalProvider in ClientOnly (not just WalletButton) prevents any SSR attempt to render wallet-dependent code. The FallbackLayout provides the same visual structure during SSR.
- **Wallet Standard auto-detection:** Passing `wallets={[]}` to WalletProvider enables Wallet Standard, which auto-detects Phantom, Solflare, and Backpack without needing `@solana/wallet-adapter-wallets` package.
- **Read-only Anchor program:** useReadOnlyProgram uses a dummy wallet so market data can be fetched without a connected wallet -- critical for homepage market listings.
- **Dynamic import for @arcium-hq/client:** encryptBetForMPC uses `await import()` to gracefully handle potential browser incompatibility with descriptive error messages.
- **FallbackLayout for SSR:** Renders the same Header + Outlet structure without wallet context, so SSR produces a reasonable page without layout shift.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All lib foundation files ready for Phase 7 Plans 02 and 03 to build on
- useAnchorProgram and useReadOnlyProgram hooks available for data fetching hooks
- PDA helpers available for market, pool, vault, position, and config account lookups
- encryptBetForMPC ready for bet placement transaction flow
- WalletButton and providers ready -- wallet connection will work when browser wallets are installed
- Sonner Toaster wired up for toast notifications in bet/claim flows

## Self-Check: PASSED

All 12 created/modified files verified present. Both task commits (8248bec, cea8859) verified in git log.

---
*Phase: 07-core-ui-integration*
*Completed: 2026-03-04*
