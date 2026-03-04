# Phase 7: Core UI Integration - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the mock-data frontend to live on-chain data. Users can browse real markets, connect a Solana wallet, place encrypted bets through the fog-themed UI, see live sentiment updates, and claim payouts after resolution. This is the convergence phase — the frontend (Phase 4) meets the on-chain program (Phases 2, 3, 5, 6). Portfolio view and search are Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Wallet connection experience
- Use Solana wallet adapter library — show all detected wallets in picker modal (standard adapter behavior)
- Connected state in header shows truncated address + USDC balance (e.g. "8xK3...mP9q · 142.50 USDC")
- Clicking connected wallet opens dropdown menu: copy address, view on Solscan, disconnect
- When wallet not connected and user clicks Bet Yes/No, open wallet connect modal (intercept bet action, return to bet after connecting)

### Bet transaction flow
- Multi-step progress indicator showing: "Encrypting..." → "Submitting..." → "Awaiting confirmation..."
- When MPC lock is active (another bet in-flight), show retry state: "Market busy — retrying..." with attempt count (transparent about why it's waiting)
- On successful bet: toast notification "Bet placed: X USDC on Yes" with transaction link, non-blocking, auto-dismiss ~5s
- On failure: toast with error message and retry option
- Show user's existing position above bet form: "Your position: 50 USDC on Yes" — prevents accidental wrong-side bets
- Frontend auto-retry with exponential backoff (~2-3s intervals) for lock contention (carried from Phase 5 decision)

### Live data & refresh
- Homepage market feed: auto-poll every 15-30s to keep data fresh
- Market detail page: Solana account websocket subscription for real-time updates (sentiment, status changes)
- First page load: fog-themed loading state — heavy fog fills grid area with "Loading markets..." text (on-brand)
- Sentiment update animation: subtle fog pulse when sentiment bucket changes — light fog briefly intensifies then settles

### Resolution & claim UX
- Creator's resolve button replaces bet form in panel after deadline passes — Yes/No outcome selector in same location
- compute_payouts is permissionless — anyone can trigger after creator resolves (show "Reveal Payouts" button)
- Winners see prominent claim banner in bet panel area: "You won! Claim X USDC" with fog-clear animation revealing payout amount
- Live fog-clear animation if user is on page when market finalizes — fog dissolves in real-time (dramatic reveal moment)
- Resolved markets visited later show fog already cleared, no animation
- Losers see subtle loss indicator: "Your position: 25 USDC on No — Market resolved Yes" in muted/red text
- Non-bettors see standard resolved view with outcome badge and revealed pool totals

### Claude's Discretion
- Wallet adapter library configuration and SSR hydration handling (TanStack Start compatibility)
- TanStack Query setup, cache configuration, and polling intervals within the 15-30s range
- RPC endpoint configuration (devnet/localnet)
- IDL type generation approach
- Toast notification component implementation
- Websocket subscription management and cleanup
- Exact retry backoff timing and max attempts for lock contention
- Loading skeleton vs fog-loading transition behavior
- Error boundary and fallback states

</decisions>

<specifics>
## Specific Ideas

- Fog-themed loading is THE brand moment — "markets emerging from the fog" on first load
- Live fog-clear on resolution is the crown jewel UX — users watching a market resolve see the fog dissolve to reveal actual pool numbers and their payout
- Multi-step progress on bet placement teaches users about the encrypt → submit → MPC flow — transparency builds trust in the privacy model
- "Market busy — retrying..." with attempt count is honest about sequential lock limitations while keeping user informed
- Position display above bet form serves double duty: prevents wrong-side bets AND previews the Portfolio view (Phase 9)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MarketCard` component (`app/src/components/market/MarketCard.tsx`): Full card with fog overlays, countdown, sentiment bar — needs MockMarket type replaced with on-chain data type
- `BetPlacement` component (`app/src/components/market/BetPlacement.tsx`): Amount input, quick amounts, Yes/No buttons — needs real transaction wiring
- `MarketDetail` component (`app/src/components/market/MarketDetail.tsx`): Market info display — needs live data binding
- `FogOverlay` component (`app/src/components/fog/FogOverlay.tsx`): Density prop (heavy/light), revealed prop with dissolve animation — ready for real resolution trigger
- `CountdownTimer` component (`app/src/components/market/CountdownTimer.tsx`): Live countdown with urgency color — no changes needed
- `CategoryTabs` component (`app/src/components/layout/CategoryTabs.tsx`): Category filtering — needs on-chain category data
- `Header` component (`app/src/components/Header.tsx`): Has placeholder "Connect Wallet" button — replace with real wallet adapter
- `Button` component (`app/src/components/ui/button.tsx`): CVA-based with variants — extend for wallet/transaction states
- `cn()` utility (`app/src/lib/utils.ts`): Tailwind class merging — standard pattern

### Established Patterns
- TanStack Start with file-based routing (`app/src/routes/`)
- `#/` import alias for app source paths
- Dark-first theme with oklch CSS variables in `app.css`
- `MockMarket` interface (`app/src/lib/mock-data.ts`) defines current data shape — replace with on-chain Market/UserPosition types
- Serif italic for questions, mono for numbers/stats, DM Sans for UI text
- `@coral-xyz/anchor` 0.32.1 and `@solana/web3.js` v1 already in package.json
- `@arcium-hq/client` 0.5.2 already in package.json for client-side encryption

### Integration Points
- `__root.tsx`: Root layout needs wallet provider wrapping (WalletProvider, ConnectionProvider)
- `index.tsx`: Homepage replaces `MOCK_MARKETS` import with TanStack Query hook fetching on-chain markets
- `market/$id.tsx`: Detail page replaces mock market lookup with on-chain account fetch + websocket subscription
- `mock-data.ts`: Will be deprecated — replaced by on-chain data fetching utilities
- On-chain program IDL: Source for TypeScript types (Market, UserPosition, MarketPool accounts)
- Market vault PDA `[b"vault", market_id.to_le_bytes()]` for USDC balance display
- SPL Token accounts for user USDC balance in header

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-core-ui-integration*
*Context gathered: 2026-03-04*
