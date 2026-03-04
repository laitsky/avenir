# Phase 9: Portfolio & Search - Research

**Researched:** 2026-03-04
**Domain:** Frontend UI (React portfolio view, client-side search, responsive design)
**Confidence:** HIGH

## Summary

Phase 9 is a pure frontend phase -- no new on-chain code, no new hooks that write transactions (except wiring the existing `useClaimPayout`). The three deliverables are: (1) a portfolio page that fetches all of a connected wallet's UserPosition accounts, enriches them with market data, and renders them in three sections (Active, Claimable, History); (2) a header search bar that filters the already-fetched markets array client-side with an as-you-type dropdown; (3) a responsive design pass that adds a hamburger menu on mobile, a sticky bottom bet bar on the market detail page, and ensures all pages work on phone viewports.

The existing codebase provides nearly all the building blocks. `useMarkets` already fetches all markets with 20s polling. `useClaimPayout` handles claim transactions. `useUserPosition` fetches a single position by market ID -- the new `useUserPositions` hook needs to call `program.account.userPosition.all()` with a `memcmp` filter on the user's pubkey at byte offset 16 (8-byte Anchor discriminator + 8-byte market_id). The `FogOverlay`, `CountdownTimer`, and `Button` components are all ready for reuse. No new dependencies are needed.

**Primary recommendation:** Build `useUserPositions` hook first (it's the data layer everything depends on), then portfolio components, then search, then responsive audit. All work is isolated frontend components and CSS -- no cross-cutting concerns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Three sections: **Active** (open/disputed markets), **Claimable** (won bets not yet claimed), **History** (resolved + claimed)
- Summary bar at top showing: total active positions, total USDC staked, total winnings claimed
- Position cards show: market question, user's side (Yes/No), amount staked, market status/countdown
- Resolved position cards show: outcome + payout amount
- Active positions show "Payout: Encrypted" behind fog overlay (pools are hidden until resolution)
- Claim button directly on each claimable position card -- one-click payout without navigating to market detail
- Losing positions in history shown with reduced opacity and subtle "Lost" badge
- Wallet disconnected: existing shell with "Connect Wallet" CTA (already built)
- Wallet connected, no positions: "You haven't placed any bets yet" with "Browse Markets" button linking to homepage
- All positions resolved/claimed: History section prominent as main content, subtle banner above: "All caught up -- find new markets to bet on"
- Search bar in the header -- always accessible from any page
- As-you-type dropdown showing top matching markets (click to navigate to market detail)
- Client-side filtering of already-fetched markets array (useMarkets hook loads all markets)
- Searchable fields: question, description, category
- Search includes all markets regardless of status (live, resolved, finalized) with status badges
- Mobile: magnifying glass icon in header, expands to full-width search input overlay on tap
- Priority: functional -- all pages usable, proper touch targets (44px+), no horizontal overflow
- Header: compact layout with logo + hamburger menu on mobile (Markets, Portfolio, Search, Connect Wallet inside menu)
- Market detail: sticky bottom bet bar on mobile -- always visible while scrolling market info
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-04 | Portfolio view shows active positions, potential payouts, and resolved bet history | `useUserPositions` hook with memcmp filter + position-market join + three-section UI (Active/Claimable/History) + inline claim via `useClaimPayout` |
| UX-05 | Full-text search across market questions, descriptions, and categories | Client-side filter over `useMarkets` data with case-insensitive substring matching on question, resolutionSource, and CATEGORY_MAP name |
| UX-08 | Responsive design works on mobile browsers | Hamburger menu on mobile header, sticky bottom bet bar on market detail, single-column portfolio layout, mobile search overlay, 44px+ touch targets |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | Component framework | Already in use |
| TanStack Query | (via @tanstack/react-start) | Data fetching + caching | Already in use for all hooks |
| TanStack Router | 1.132.0 | File-based routing + navigation | Already in use |
| @coral-xyz/anchor | 0.32.1 | Solana program client + account fetching | Already in use; provides `program.account.userPosition.all()` with filter support |
| Tailwind CSS | 4.1.18 | Utility-first CSS + responsive breakpoints | Already in use; `sm:`, `md:`, `lg:` breakpoints for responsive |
| lucide-react | 0.561.0 | Icon library | Already in use (Wallet, Copy, ExternalLink, LogOut icons) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | Component variant management | Position card variants (active/claimable/lost/claimed) |
| sonner | 2.0.7 | Toast notifications | Claim success/error feedback |
| clsx + tailwind-merge (cn()) | N/A | Conditional class composition | All component styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side search | Fuse.js fuzzy search | Overkill for <100 markets; simple `includes()` suffices for v1 market count |
| Custom hamburger menu | Radix NavigationMenu | Already have Radix in deps, but a simple `useState` toggle is lighter and matches existing patterns |
| CSS media queries via Tailwind | Container queries | Tailwind v4 supports them, but standard breakpoints match existing grid pattern |

**Installation:**
```bash
# No new packages needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── hooks/
│   └── useUserPositions.ts     # NEW: Fetch all positions for connected wallet
├── components/
│   ├── portfolio/
│   │   ├── PortfolioSummary.tsx # Summary bar (stats)
│   │   ├── PositionCard.tsx     # Individual position card (shared across sections)
│   │   └── PositionSection.tsx  # Section wrapper (Active/Claimable/History header)
│   ├── search/
│   │   └── SearchBar.tsx        # Header search with dropdown results
│   └── Header.tsx               # MODIFIED: Add search + hamburger menu
├── routes/
│   └── portfolio.tsx            # MODIFIED: Replace shell with full portfolio
└── styles/
    └── app.css                  # MODIFIED: Add mobile-specific utilities if needed
```

### Pattern 1: Fetch All User Positions with memcmp Filter
**What:** Use Anchor's `program.account.userPosition.all()` with a `memcmp` filter to fetch only positions belonging to the connected wallet, avoiding loading all positions for all users.
**When to use:** `useUserPositions` hook.
**Example:**
```typescript
// Source: Anchor JS client API -- program.account.*.all() with filters
// UserPosition layout: [8 discriminator][8 market_id][32 user][8 yes_amount][8 no_amount][1 claimed][1 bump]
// User pubkey is at offset 16 (8 + 8)

import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { useReadOnlyProgram } from '#/lib/anchor'
import { mapPositionAccount } from '#/lib/types'
import bs58 from 'bs58' // already available via @solana/web3.js

export function useUserPositions() {
  const program = useReadOnlyProgram()
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['positions', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return []
      const accounts = await program.account.userPosition.all([
        {
          memcmp: {
            offset: 16, // 8 discriminator + 8 market_id
            bytes: publicKey.toBase58(),
          },
        },
      ])
      return accounts.map((a) => mapPositionAccount(a.publicKey, a.account as any))
    },
    enabled: !!publicKey,
    refetchInterval: 30_000, // Poll every 30s (less aggressive than markets)
  })
}
```

### Pattern 2: Position-Market Data Join
**What:** Enrich position data with market data by joining positions with the markets array already cached by `useMarkets`.
**When to use:** Portfolio page -- positions need market question, status, outcome, pool amounts.
**Example:**
```typescript
// Join positions with markets using a Map for O(1) lookup
interface EnrichedPosition {
  position: OnChainPosition
  market: OnChainMarket | null
}

function enrichPositions(
  positions: OnChainPosition[],
  markets: OnChainMarket[],
): EnrichedPosition[] {
  const marketMap = new Map(markets.map((m) => [m.id, m]))
  return positions.map((p) => ({
    position: p,
    market: marketMap.get(p.marketId) ?? null,
  }))
}

// Classification logic for three sections:
function classifyPosition(pos: OnChainPosition, market: OnChainMarket | null): 'active' | 'claimable' | 'history' {
  if (!market) return 'history' // orphaned position, treat as history

  // Active: market is Open (0), Locked (1), or Disputed (3)
  if (market.state === 0 || market.state === 1 || market.state === 3) return 'active'

  // Finalized (4): check if winner and unclaimed
  if (market.state === 4) {
    if (pos.claimed) return 'history'
    const isWinner =
      (market.winningOutcome === 1 && pos.yesAmount > 0) ||
      (market.winningOutcome === 2 && pos.noAmount > 0)
    return isWinner ? 'claimable' : 'history'
  }

  // Resolved (2): awaiting payout computation -- treat as active
  if (market.state === 2) return 'active'

  return 'history'
}
```

### Pattern 3: Client-Side Search Filtering
**What:** Filter the already-cached markets array using case-insensitive substring matching.
**When to use:** Search bar dropdown.
**Example:**
```typescript
import { useMemo, useState } from 'react'
import { useMarkets } from '#/hooks/useMarkets'
import { CATEGORY_MAP } from '#/lib/types'

function useSearchMarkets(query: string) {
  const { data: markets } = useMarkets()

  return useMemo(() => {
    if (!query.trim() || !markets) return []
    const lower = query.toLowerCase()
    return markets
      .filter((m) =>
        m.question.toLowerCase().includes(lower) ||
        m.resolutionSource.toLowerCase().includes(lower) ||
        (CATEGORY_MAP[m.category] ?? '').toLowerCase().includes(lower)
      )
      .slice(0, 8) // Limit dropdown results
  }, [query, markets])
}
```

### Pattern 4: Mobile Hamburger Menu
**What:** `useState` toggle with a slide-in overlay for mobile nav. Desktop keeps the existing inline nav links.
**When to use:** Header component on viewports below `md` (768px).
**Example:**
```typescript
// Responsive header pattern:
// - Desktop (md+): existing inline nav (Markets, Portfolio) + search bar + wallet button
// - Mobile (<md): logo + search icon + hamburger icon
//   Hamburger opens: slide-in panel with Markets, Portfolio, Connect Wallet links

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 z-50 w-full">
      <nav className="...">
        {/* Logo -- always visible */}
        <Link to="/">Avenir</Link>

        {/* Desktop nav -- hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          <SearchBar />
          <Link to="/">Markets</Link>
          <Link to="/portfolio">Portfolio</Link>
          <WalletButton />
        </div>

        {/* Mobile controls -- hidden on desktop */}
        <div className="flex md:hidden items-center gap-3">
          <MobileSearchTrigger />
          <button onClick={() => setMenuOpen(!menuOpen)}>
            {/* Hamburger icon */}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && <MobileMenuOverlay onClose={() => setMenuOpen(false)} />}
    </header>
  )
}
```

### Pattern 5: Sticky Bottom Bet Bar on Mobile
**What:** On mobile viewports, the BetPlacement panel becomes a fixed-bottom bar that's always visible while scrolling the market detail page.
**When to use:** Market detail page (`/market/$id`) on mobile.
**Example:**
```typescript
// In routes/market/$id.tsx:
// Desktop: side panel (lg:sticky lg:top-28, existing pattern)
// Mobile: fixed bottom bar

<div className="grid gap-10 lg:grid-cols-[1fr_340px]">
  <MarketDetail market={market} dispute={dispute} />

  {/* Desktop: sticky sidebar */}
  <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start">
    <BetPlacement market={market} position={position} dispute={dispute} />
  </aside>
</div>

{/* Mobile: fixed bottom bar */}
<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-4 lg:hidden">
  <BetPlacementCompact market={market} position={position} dispute={dispute} />
</div>
```

### Anti-Patterns to Avoid
- **Fetching positions one-by-one:** Do NOT iterate over markets and call `useUserPosition(marketId)` for each. Use `program.account.userPosition.all()` with a single RPC call.
- **Creating separate search backend/index:** For v1 market count (<100), client-side `includes()` is faster and simpler than any server-side search infrastructure.
- **Re-fetching markets in portfolio:** Use the existing `useMarkets` hook data (TanStack Query cache). Don't create a separate fetch.
- **Inline responsive overrides without Tailwind:** All responsive work should use Tailwind breakpoint prefixes (`sm:`, `md:`, `lg:`), not custom CSS media queries.
- **Nesting interactive elements:** Don't put a `<button>` (claim) inside a `<Link>` (navigate to market). Use `e.stopPropagation()` or separate the card click target from the claim action.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Position data fetching | Custom RPC calls with getProgramAccounts | `program.account.userPosition.all([{ memcmp }])` | Anchor handles discriminator filtering + type deserialization |
| Search indexing | Fuse.js, Lunr, or custom trie | `Array.filter()` + `String.includes()` | <100 markets, runs in <1ms, zero deps |
| Mobile menu | Custom CSS animation library | Tailwind `translate-x` + `transition` classes | GPU-composited, matches existing animation patterns |
| Payout calculation | Custom math | Reuse the formula from `ClaimPayoutMode` in BetPlacement.tsx | Already handles fee deduction (200 bps), edge cases |
| Toast notifications | Custom notification system | `sonner` (already installed) | Claim success/error feedback |

**Key insight:** This phase is purely UI composition over existing data and transaction hooks. Every non-trivial piece of infrastructure (RPC, wallet, transactions, caching, toasts) is already in place from Phases 7-8.

## Common Pitfalls

### Pitfall 1: N+1 RPC Calls for Position Enrichment
**What goes wrong:** Fetching market data for each position individually creates N RPC calls.
**Why it happens:** Natural instinct to `useMarket(position.marketId)` inside a loop.
**How to avoid:** Use `useMarkets()` (already fetches ALL markets) and join in-memory. Both `useUserPositions` and `useMarkets` use TanStack Query caching, so the join is pure computation over cached data.
**Warning signs:** Multiple `useQuery` hooks inside `.map()` calls, slow portfolio load times.

### Pitfall 2: Anchor memcmp Offset Miscalculation
**What goes wrong:** Filtering by user pubkey at wrong offset returns no results (or wrong results).
**Why it happens:** Forgetting the 8-byte Anchor discriminator prefix when counting field offsets.
**How to avoid:** UserPosition struct layout: `[8 discriminator][8 market_id][32 user]`. User pubkey starts at offset 16. Pass `publicKey.toBase58()` as the `bytes` value (Anchor/RPC accept base58 encoding).
**Warning signs:** Empty position list despite having on-chain positions; test with a known position.

### Pitfall 3: Claim Button Inside Clickable Card
**What goes wrong:** Clicking "Claim" navigates to market detail instead of claiming payout.
**Why it happens:** Claim button is nested inside a Link/clickable card container.
**How to avoid:** Either: (a) make the card NOT a link and add a separate "View Market" action, or (b) use `e.preventDefault()` + `e.stopPropagation()` on the claim button's onClick handler.
**Warning signs:** Click on "Claim" navigates away instead of triggering transaction.

### Pitfall 4: Search Dropdown Interfering with Navigation
**What goes wrong:** Search dropdown stays open when clicking a result, or closes before the click registers.
**Why it happens:** `onBlur` fires before `onClick` on dropdown items.
**How to avoid:** Use `onMouseDown` (fires before blur) for dropdown item clicks, or use a `ref`-based click-outside pattern (already used in `WalletButton.tsx` -- reuse that pattern).
**Warning signs:** Clicking a search result doesn't navigate; dropdown flickers.

### Pitfall 5: Mobile Fixed-Bottom Bar Overlapping Content
**What goes wrong:** The sticky bottom bet bar covers the last section of market detail content.
**Why it happens:** Fixed positioning removes the element from document flow.
**How to avoid:** Add `pb-24` (or appropriate bottom padding) to the market detail page content on mobile to ensure nothing is hidden behind the fixed bar.
**Warning signs:** Can't see/scroll to the bottom of market detail content on mobile.

### Pitfall 6: SSR Hydration Mismatch on Wallet-Dependent Components
**What goes wrong:** Portfolio renders server-side without wallet context, hydrates differently client-side.
**Why it happens:** `useWallet()` returns null during SSR, different from client state.
**How to avoid:** The entire wallet provider tree is already wrapped in `ClientOnly` in `__root.tsx`. Portfolio page renders inside this tree, so SSR always shows the `FallbackLayout`. No additional SSR handling needed for wallet-dependent components.
**Warning signs:** Hydration mismatch warnings in console.

### Pitfall 7: Description Field Missing from OnChainMarket Type
**What goes wrong:** CONTEXT.md says search should match "question, description, category" but `OnChainMarket` has `resolutionSource` not `description`.
**Why it happens:** The on-chain Market struct uses `resolution_source` for the descriptive text field.
**How to avoid:** Search against `market.resolutionSource` (which serves as the description/source field in the UI). The CONTEXT.md search spec of "description" maps to this field.
**Warning signs:** "description" field access errors; search doesn't match expected content.

## Code Examples

Verified patterns from existing codebase:

### Payout Calculation (from BetPlacement.tsx ClaimPayoutMode)
```typescript
// Source: app/src/components/market/BetPlacement.tsx lines 672-686
const totalPool = market.revealedYesPool + market.revealedNoPool
const userWinning =
  market.winningOutcome === 1 ? position.yesAmount : position.noAmount
const winningPool =
  market.winningOutcome === 1
    ? market.revealedYesPool
    : market.revealedNoPool

let netPayout = 0
if (winningPool > 0) {
  const gross = (userWinning * totalPool) / winningPool
  const feeBps = 200 // 2% fee
  netPayout = gross - (gross * feeBps) / 10000
}
```

### USDC Amount Formatting
```typescript
// Consistent pattern used across codebase: divide by 1_000_000, format with .toFixed(2) or .toLocaleString()
// Source: app/src/components/market/BetPlacement.tsx, MarketCard.tsx
const displayAmount = (amountLamports / 1_000_000).toFixed(2)       // "12.50"
const displayPool = (poolLamports / 1_000_000).toLocaleString()     // "1,234"
```

### Click-Outside Dropdown Pattern (from WalletButton.tsx)
```typescript
// Source: app/src/components/wallet/WalletButton.tsx lines 33-48
const dropdownRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false)
    }
  }
  if (dropdownOpen) {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }
}, [dropdownOpen])
```

### TanStack Router Link Navigation
```typescript
// Source: app/src/components/layout/MarketGrid.tsx
import { Link } from '@tanstack/react-router'

<Link
  to="/market/$id"
  params={{ id: market.id.toString() }}
  className="no-underline"
>
  <MarketCard market={market} />
</Link>
```

### CVA Variant Pattern (from Button)
```typescript
// Source: app/src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

// Apply to position cards:
const positionCardVariants = cva(
  'rounded-xl bg-card p-5 transition-all duration-300', // base
  {
    variants: {
      status: {
        active: 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5',
        claimable: 'ring-1 ring-accent/20 hover:ring-accent/40',
        won: 'opacity-70',
        lost: 'opacity-40',
      },
    },
  }
)
```

### Market State Classification
```typescript
// Source: app/src/lib/types.ts STATE_MAP + app/src/components/market/MarketCard.tsx
// States: 0=Open, 1=Locked, 2=Resolved, 3=Disputed, 4=Finalized
// Active positions: market.state in [0, 1, 2, 3]
// Claimable: market.state === 4 && isWinner && !position.claimed
// History: market.state === 4 && (position.claimed || isLoser)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS-based hamburger menus | Tailwind responsive + useState toggle | Standard | No JS animation library needed; GPU-composited transforms |
| Debounced search input + API call | Client-side `useMemo` filter | When dataset is small (<100 items) | Zero latency, no loading states, no network requests |
| getProgramAccounts raw RPC | Anchor `program.account.*.all([filters])` | Anchor 0.x | Type-safe, handles discriminator automatically |

**Deprecated/outdated:**
- None relevant -- all existing patterns are current.

## Open Questions

1. **bs58 Encoding for memcmp Filter**
   - What we know: Anchor's `.all()` method accepts a `memcmp` filter with `bytes` as a base58-encoded string. `publicKey.toBase58()` provides this.
   - What's unclear: Whether the Anchor JS client accepts raw `Buffer` or only base58 strings for the `bytes` field.
   - Recommendation: Use `publicKey.toBase58()` (base58 string) -- this is the standard pattern in Anchor examples and matches the Solana RPC `getFilteredProgramAccounts` spec.

2. **Search Field Mapping: "description" vs "resolutionSource"**
   - What we know: CONTEXT.md specifies searching "question, description, category." The on-chain Market struct has `question` and `resolution_source` but no `description` field. In the UI, `resolutionSource` is displayed as the market's descriptive/source text.
   - What's unclear: Whether the user expects a separate description field or considers `resolutionSource` to be the description.
   - Recommendation: Treat `resolutionSource` as the searchable description field. This matches the on-chain data model and existing UI usage.

3. **Position Polling Frequency**
   - What we know: Markets poll every 20s. Positions change less frequently (only on bet placement, claim).
   - What's unclear: Ideal polling interval for positions that balances freshness vs. RPC load.
   - Recommendation: Poll every 30s by default. Also add websocket subscription on each position PDA (like `useUserPosition` does for single positions), but this may be impractical for many positions. Start with polling; optimize later if needed.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `app/src/hooks/useUserPosition.ts`, `useMarkets.ts`, `useClaimPayout.ts`, `useMarketPool.ts` -- verified data fetching patterns
- Existing codebase analysis: `app/src/components/market/BetPlacement.tsx` -- verified payout calculation, state machine, claim flow
- Existing codebase analysis: `programs/avenir/src/state/user_position.rs` -- verified struct layout (discriminator 8 + market_id 8 + user 32 = offset 16)
- Existing codebase analysis: `app/src/components/wallet/WalletButton.tsx` -- verified click-outside dropdown pattern
- Existing codebase analysis: `app/src/routes/__root.tsx` -- verified SSR/ClientOnly wrapping eliminates hydration concerns

### Secondary (MEDIUM confidence)
- Anchor `program.account.*.all()` filter API -- based on established Anchor patterns in existing test code and official Anchor examples; standard `memcmp` filter with base58 bytes string

### Tertiary (LOW confidence)
- None -- all findings verified against existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed; all libraries already in use and verified
- Architecture: HIGH - Patterns directly derived from existing codebase (useMarkets, useUserPosition, WalletButton, BetPlacement)
- Pitfalls: HIGH - Based on real patterns observed in codebase (N+1 queries, nested links, click-outside) and standard web/Solana gotchas

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- pure frontend, no fast-moving external dependencies)
