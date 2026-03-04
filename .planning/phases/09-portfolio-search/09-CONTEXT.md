# Phase 9: Portfolio & Search - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can track their betting positions in a portfolio view, search for markets via a header search bar, and use the app comfortably on mobile browsers. This phase covers UX-04 (portfolio), UX-05 (search), and UX-08 (responsive design). Market creation, dispute features, and new on-chain work are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Portfolio structure
- Three sections: **Active** (open/disputed markets), **Claimable** (won bets not yet claimed), **History** (resolved + claimed)
- Summary bar at top showing: total active positions, total USDC staked, total winnings claimed
- Position cards show: market question, user's side (Yes/No), amount staked, market status/countdown
- Resolved position cards show: outcome + payout amount
- Active positions show "Payout: Encrypted" behind fog overlay (pools are hidden until resolution)
- Claim button directly on each claimable position card — one-click payout without navigating to market detail
- Losing positions in history shown with reduced opacity and subtle "Lost" badge

### Portfolio empty & edge states
- Wallet disconnected: existing shell with "Connect Wallet" CTA (already built)
- Wallet connected, no positions: "You haven't placed any bets yet" with "Browse Markets" button linking to homepage
- All positions resolved/claimed: History section prominent as main content, subtle banner above: "All caught up — find new markets to bet on"

### Search behavior
- Search bar in the header — always accessible from any page
- As-you-type dropdown showing top matching markets (click to navigate to market detail)
- Client-side filtering of already-fetched markets array (useMarkets hook loads all markets)
- Searchable fields: question, description, category
- Search includes all markets regardless of status (live, resolved, finalized) with status badges
- Mobile: magnifying glass icon in header, expands to full-width search input overlay on tap

### Mobile responsiveness
- Priority: functional — all pages usable, proper touch targets (44px+), no horizontal overflow
- Header: compact layout with logo + hamburger menu on mobile (Markets, Portfolio, Search, Connect Wallet inside menu)
- Market detail: sticky bottom bet bar on mobile — always visible while scrolling market info
- Market grid: existing 3/2/1 column responsive grid (already built)
- Portfolio: single-column card layout on mobile

### Claude's Discretion
- Search dropdown styling and max results count
- Summary bar exact layout and stat formatting
- Position card component design within the compact spec
- Hamburger menu animation and styling
- Sticky bottom bet bar height and compact layout
- Touch target sizing and spacing adjustments
- Mobile search overlay transition animation
- useUserPositions hook implementation (fetch all positions for connected wallet)
- How to enrich position data with market info (join positions with markets)

</decisions>

<specifics>
## Specific Ideas

- Fog overlay on active position payouts maintains the encrypted-data visual language from the rest of the app
- Claim from portfolio is a key UX win — users shouldn't have to hunt through markets to collect winnings
- Three-section portfolio (Active / Claimable / History) gives clear visual hierarchy of what needs attention
- Client-side search is pragmatic for v1 market count — no infrastructure overhead
- Sticky bottom bet bar on mobile mirrors patterns from Polymarket/trading apps — bet action always within thumb reach

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useUserPosition` hook (`app/src/hooks/useUserPosition.ts`): Fetches single position by marketId — need new hook for ALL user positions
- `useMarkets` hook (`app/src/hooks/useMarkets.ts`): Fetches all markets with 20s auto-poll — reuse for search filtering and position enrichment
- `useClaimPayout` hook (`app/src/hooks/useClaimPayout.ts`): Claim transaction logic — wire to portfolio claim buttons
- `MarketCard` component: Card with fog overlays, countdown, sentiment — reference for position card styling
- `FogOverlay` component: density prop (heavy/light) — use for encrypted payout display on active positions
- `CountdownTimer` component: Live countdown with urgency color — reuse on active position cards
- `Header` component: Already has Markets/Portfolio links + wallet button — add search bar here
- `portfolio.tsx`: Shell page exists with "no wallet connected" empty state — replace with full portfolio

### Established Patterns
- TanStack Query for data fetching with `useQuery` / `queryKey` pattern
- `mapPositionAccount` / `mapMarketAccount` type mappers in `types.ts`
- On-chain types: `OnChainPosition` (marketId, yesAmount, noAmount, claimed), `OnChainMarket`
- `getPositionPda` in `pda.ts` for position PDA derivation
- Websocket subscriptions for real-time updates (used in useUserPosition, useMarket)
- CVA-based component variants (Button component pattern)
- Dark-first theme with oklch CSS variables, Tailwind v4

### Integration Points
- `portfolio.tsx`: Replace shell with full portfolio view using wallet-connected position fetching
- `Header.tsx`: Add search input component between nav links and wallet button
- Anchor program `program.account.userPosition.all()` with filter for user's pubkey — fetch all positions
- Position data needs market data join (position has marketId, need market question/status/outcome)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-portfolio-search*
*Context gathered: 2026-03-04*
