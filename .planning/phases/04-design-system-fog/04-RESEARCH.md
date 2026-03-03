# Phase 4: Design System & Fog - Research

**Researched:** 2026-03-03
**Domain:** CSS design systems, Tailwind v4 theming, CSS animations & blur effects
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Color palette**: Deep emerald green primary, warm charcoal with green undertone background (#0f1a14 range), slightly lifted card surfaces (#152019, #1a2b22 range), muted gold accent (aged brass, not shiny), sage/moss secondary. Replace current shadcn blue-gray oklch palette (~285 hue) with forest-tinted oklch values.
- **Fog visual treatment**: CSS backdrop-blur + semi-transparent emerald/sage gradient overlay ("frosted glass" effect). Two density levels: heavy fog (fully hidden values) and light fog (partially revealed info). Subtle drift motion while idle. Fog component accepts density prop (heavy/light).
- **Fog-clear reveal animation**: Dissolve outward from center (mist clearing effect). ~700ms duration with ease-out easing. Fog opacity + blur reduce simultaneously as underlying value fades in. Triggered programmatically.
- **Market card composition**: Rich card layout with category tag, deadline countdown, question text, fogged sentiment, fogged pool total, bet count, Yes/No quick-bet buttons. Fog applied to TWO areas per card: sentiment bucket area (light fog) and pool total area (heavy fog). Resolved market cards: fog cleared, actual numbers visible, green/red outcome badge. Cards are clickable -- navigate to market detail page.
- **Market detail page**: Sidebar panel layout: market info/description on left, bet placement form sticky on right. Bet placement panel: amount input (USDC), Yes button (gold accent), No button (muted/secondary). Market info section: question, description, resolution source, deadline countdown, category, fogged sentiment, fogged pool totals.
- **Homepage feed layout**: Responsive card grid (3 columns desktop, 2 tablet, 1 mobile). Category navigation horizontal tab bar (All | Politics | Crypto | Sports | Culture | Economics). Active category tab highlighted with gold accent. Sorting options: trending, newest, ending soon. Polymarket-inspired feel -- clean, minimal chrome, generous spacing.
- **Header/navigation**: Minimal single-bar header: logo (left), category tabs (center/left), wallet connect button (right). Sticky header with backdrop blur (existing pattern preserved). Search deferred to Phase 9.

### Claude's Discretion
- Exact oklch color values for the forest palette (emerald, charcoal, gold, sage)
- Sage/moss secondary color usage across UI elements
- Typography choices (font sizes, weights, line heights)
- Spacing system and card padding/gap values
- Empty state designs (no markets, loading states)
- Portfolio page shell layout
- shadcn/ui component customization depth
- Fog gradient CSS implementation details (exact blur values, opacity levels)
- Idle fog drift animation technique (CSS animation vs JS)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INF-06 | Forest/fog design system -- deep forest green, sage, muted gold accents, warm dark background | Tailwind v4 @theme inline tokens with oklch color space; replace existing shadcn blue-gray CSS variables with forest-tinted values |
| UX-06 | Fog gradients overlay encrypted data (pool amounts, sentiment, jury votes, market cards) | CSS backdrop-filter: blur() + semi-transparent gradient overlay component with density prop (heavy/light); tw-animate-css for enter/exit transitions |
| UX-07 | Fog clears with animation when data is revealed (resolution, dispute outcome) | CSS @keyframes fog-clear animation: simultaneous blur reduction + opacity fade + content fade-in over 700ms ease-out; triggered via React state |
</phase_requirements>

## Summary

This phase builds the forest/fog design system using Tailwind CSS v4's `@theme inline` directive to define oklch color tokens, then creates a reusable fog gradient component using CSS `backdrop-filter: blur()` with animated reveal, and finally builds market card, detail, and layout shell components with mock data.

The existing codebase provides a solid foundation: Tailwind v4 is already configured with `@theme inline` and oklch CSS variables in `app/src/styles/app.css`, shadcn/ui is integrated with CVA-based button variants, `cn()` utility is established, and route shells exist for all three pages (index, market/$id, portfolio). The work is primarily: (1) replacing the default blue-gray (~285 hue) color palette with forest-tinted oklch values, (2) creating a `FogOverlay` component combining backdrop-blur with gradient overlays and animated reveal, and (3) building composed market card/detail components with mock data.

The `tw-animate-css` library already installed in the project provides `animate-in`/`animate-out`, `fade-in`/`fade-out`, and `blur-in`/`blur-out` utilities that can be composed for the fog-clear animation. Custom `@keyframes` defined in `@theme` will handle the fog drift idle animation. All animations must respect `prefers-reduced-motion` via Tailwind's `motion-safe:` variant.

**Primary recommendation:** Replace the existing shadcn oklch palette in `app.css` with forest-tinted oklch values (hue ~155-165 for greens, ~85 for gold), build FogOverlay as a single composable component using CSS `backdrop-filter` + gradient overlay, and use `tw-animate-css` composition (`animate-in fade-in blur-in`) for the reveal animation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | ^4.1.18 | CSS framework with @theme design tokens | Already installed; v4 @theme inline provides CSS-first token system with oklch support |
| tw-animate-css | ^1.3.6 | Animation utilities for Tailwind v4 | Already installed; provides `animate-in`/`animate-out`, `fade-in`, `blur-in` composable utilities |
| class-variance-authority | ^0.7.1 | Component variant management | Already installed; used by shadcn/ui Button component; extend for market card variants |
| radix-ui | ^1.4.3 | Accessible UI primitives | Already installed; provides Slot, Tabs, and other primitives for category tabs and inputs |
| lucide-react | ^0.561.0 | Icon library | Already installed; provides icons for category tabs, sorting indicators, outcome badges |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | ^2.1.1 / ^3.0.2 | Class name composition | Already installed; `cn()` utility for conditional Tailwind classes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tw-animate-css | framer-motion | framer-motion provides richer JS-driven animations but adds ~30KB; tw-animate-css is CSS-only and already installed |
| CSS backdrop-filter | canvas blur | Canvas provides programmatic control but requires JS, breaks SSR, and is harder to maintain |
| Custom @keyframes | GSAP/anime.js | JS animation libraries offer fine-grained control but are overkill for CSS-achievable blur/opacity transitions |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── styles/
│   └── app.css                    # Design tokens (@theme inline block)
├── components/
│   ├── ui/
│   │   ├── button.tsx             # Existing -- extend with gold/forest variants
│   │   ├── badge.tsx              # Category tag, outcome badge
│   │   ├── input.tsx              # Bet amount input
│   │   └── tabs.tsx               # Category tab bar (radix-ui Tabs)
│   ├── fog/
│   │   └── FogOverlay.tsx         # Reusable fog gradient + reveal component
│   ├── market/
│   │   ├── MarketCard.tsx         # Market card with fog overlays
│   │   ├── MarketDetail.tsx       # Market detail info panel
│   │   ├── BetPlacement.tsx       # Bet placement form
│   │   └── CountdownTimer.tsx     # Deadline countdown display
│   ├── layout/
│   │   ├── MarketGrid.tsx         # Responsive card grid
│   │   ├── CategoryTabs.tsx       # Category navigation tabs
│   │   └── SortControls.tsx       # Sorting dropdown/buttons
│   └── Header.tsx                 # Existing -- add category tabs
├── lib/
│   ├── utils.ts                   # Existing cn() utility
│   └── mock-data.ts               # Mock market data for development
└── routes/
    ├── __root.tsx                  # Existing root layout
    ├── index.tsx                   # Homepage feed layout
    ├── market/$id.tsx              # Market detail page
    └── portfolio.tsx               # Portfolio shell
```

### Pattern 1: Design Token Architecture (Tailwind v4 @theme inline)
**What:** Define all design tokens as CSS custom properties within `:root` and reference them via `@theme inline` block. The `inline` keyword is critical because it resolves `var()` references at build time rather than deferring to runtime.
**When to use:** When tokens reference other CSS variables (which is the shadcn/ui pattern already established).
**Example:**
```css
/* Source: https://tailwindcss.com/docs/theme */
/* Replace blue-gray palette (~285 hue) with forest-tinted values */
:root {
  /* Forest palette -- oklch(lightness chroma hue) */
  --background: oklch(0.13 0.02 160);        /* warm charcoal with green undertone */
  --foreground: oklch(0.93 0.01 160);        /* off-white with slight warmth */
  --card: oklch(0.17 0.02 160);             /* lifted surface */
  --card-foreground: oklch(0.93 0.01 160);
  --primary: oklch(0.45 0.12 160);           /* deep emerald green */
  --primary-foreground: oklch(0.98 0.005 160);
  --secondary: oklch(0.30 0.04 155);         /* sage/moss dark */
  --secondary-foreground: oklch(0.85 0.03 155);
  --muted: oklch(0.25 0.03 155);             /* muted forest */
  --muted-foreground: oklch(0.65 0.04 155);
  --accent: oklch(0.65 0.12 85);             /* muted gold */
  --accent-foreground: oklch(0.15 0.02 85);
  --border: oklch(0.25 0.03 155);
  --input: oklch(0.22 0.03 155);
  --ring: oklch(0.45 0.08 160);
  /* ... destructive, chart colors unchanged */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... same pattern for all semantic tokens */

  /* NEW: Forest-specific tokens */
  --color-gold: var(--accent);
  --color-gold-foreground: var(--accent-foreground);
  --color-emerald: var(--primary);
  --color-sage: var(--secondary);
  --color-fog-heavy: oklch(0.15 0.03 160 / 0.85);
  --color-fog-light: oklch(0.20 0.04 155 / 0.55);
}
```

### Pattern 2: Fog Overlay Component with Density Prop
**What:** A composable component that layers a frosted glass effect over content. Uses CSS `backdrop-filter: blur()` combined with a semi-transparent gradient overlay. Accepts `density` prop to switch between heavy and light fog, and `revealed` prop to trigger the clear animation.
**When to use:** Over any encrypted/hidden data (pool totals, sentiment buckets, jury votes).
**Example:**
```tsx
// FogOverlay.tsx
import { cn } from '#/lib/utils'

interface FogOverlayProps {
  density: 'heavy' | 'light'
  revealed?: boolean
  children: React.ReactNode
  className?: string
}

export function FogOverlay({
  density,
  revealed = false,
  children,
  className,
}: FogOverlayProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Content underneath */}
      <div
        className={cn(
          'transition-opacity duration-700 ease-out',
          revealed ? 'opacity-100' : 'opacity-0'
        )}
      >
        {children}
      </div>

      {/* Fog overlay */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-700 ease-out',
          density === 'heavy'
            ? 'backdrop-blur-md bg-fog-heavy'
            : 'backdrop-blur-sm bg-fog-light',
          revealed && 'opacity-0 backdrop-blur-none pointer-events-none'
        )}
      >
        {/* Fog drift animation (idle) */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br from-emerald/20 via-transparent to-sage/15',
            !revealed && 'motion-safe:animate-fog-drift'
          )}
        />
      </div>
    </div>
  )
}
```

### Pattern 3: CVA-based Market Card with Composed Variants
**What:** Market card component using class-variance-authority for variant management (live vs resolved states), composing FogOverlay for encrypted data areas.
**When to use:** Homepage grid cards, any market summary view.
**Example:**
```tsx
// MarketCard.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#/lib/utils'
import { FogOverlay } from '#/components/fog/FogOverlay'

const marketCardVariants = cva(
  'rounded-xl border bg-card p-5 transition-colors cursor-pointer',
  {
    variants: {
      status: {
        live: 'border-border hover:border-sage/50',
        resolved: 'border-border/50',
      },
    },
    defaultVariants: { status: 'live' },
  }
)

interface MarketCardProps extends VariantProps<typeof marketCardVariants> {
  question: string
  category: string
  deadline: Date
  sentiment?: string
  poolTotal?: string
  betCount: number
  outcome?: 'yes' | 'no'
  className?: string
}

export function MarketCard({
  status,
  question,
  category,
  deadline,
  sentiment,
  poolTotal,
  betCount,
  outcome,
  className,
}: MarketCardProps) {
  const isResolved = status === 'resolved'

  return (
    <article className={cn(marketCardVariants({ status }), className)}>
      {/* Category tag + deadline */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-sage px-2 py-0.5 rounded-full bg-sage/10">
          {category}
        </span>
        <CountdownTimer deadline={deadline} />
      </div>

      {/* Question */}
      <h3 className="text-sm font-semibold text-foreground mb-4 line-clamp-2">
        {question}
      </h3>

      {/* Fogged sentiment (light fog) */}
      <FogOverlay density="light" revealed={isResolved}>
        <span className="text-sm text-muted-foreground">{sentiment}</span>
      </FogOverlay>

      {/* Fogged pool total (heavy fog) */}
      <FogOverlay density="heavy" revealed={isResolved}>
        <span className="text-lg font-bold text-gold">{poolTotal}</span>
      </FogOverlay>

      {/* Quick-bet buttons */}
      <div className="flex gap-2 mt-4">
        <Button variant="default" size="sm">Yes</Button>
        <Button variant="secondary" size="sm">No</Button>
      </div>
    </article>
  )
}
```

### Anti-Patterns to Avoid
- **Animating `filter: blur()` directly per-frame:** Blur convolution is GPU-expensive. Instead, transition between pre-blurred states using opacity. For the fog overlay, use `backdrop-filter` as a static property and animate `opacity` to reveal/hide, which is composited on the GPU.
- **Using arbitrary Tailwind values `bg-[oklch(...)]` everywhere instead of tokens:** All colors must go through the token system in `app.css` so the design system is consistent and maintainable. Never hardcode oklch values in component markup.
- **Mixing `@theme` and `@theme inline`:** The project uses `@theme inline` because tokens reference `:root` CSS variables. Never add a separate `@theme` block that would conflict. Keep everything in the single `@theme inline` block.
- **Multiple backdrop-filter layers:** Stacking multiple `backdrop-filter: blur()` elements causes exponential GPU cost. Each market card should have at most 2 fog overlays, and those overlays should not themselves contain blurred children.
- **JavaScript-driven animation loops for fog drift:** Use CSS `@keyframes` with `animation` property for the idle fog drift. JS requestAnimationFrame is unnecessary overhead for a simple gradient position shift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation enter/exit | Custom keyframe library | tw-animate-css `animate-in`/`animate-out` | Already installed; composable with `fade-in`, `blur-in`, `slide-in-from-*`; tree-shakes unused |
| Category tab navigation | Custom tab state management | radix-ui Tabs primitive | Already installed; handles keyboard navigation, ARIA, focus management |
| Class name composition | Manual string concatenation | `cn()` (clsx + tailwind-merge) | Already installed; resolves Tailwind class conflicts intelligently |
| Component variants | Conditional class objects | class-variance-authority (CVA) | Already installed; type-safe variants with defaultVariants |
| Countdown timer | setInterval from scratch | Simple `useCountdown` hook with `setInterval` + cleanup | Hand-rolling is fine here since it's ~20 lines; no library needed for a static countdown display |
| Responsive grid | Media query CSS | Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`) | Built into Tailwind; `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |

**Key insight:** The entire design system phase requires zero new dependencies. Every tool needed (Tailwind v4 tokens, tw-animate-css, CVA, radix-ui, lucide-react) is already installed. The work is configuration (color tokens) and composition (components using existing primitives).

## Common Pitfalls

### Pitfall 1: Backdrop-filter Performance on Mobile
**What goes wrong:** Using `backdrop-filter: blur()` on many elements simultaneously causes janky scrolling on mobile devices, especially with blur values above 16px.
**Why it happens:** Blur is a convolution filter that must be computed per-pixel, per-frame during scroll. Each additional blurred element multiplies GPU work.
**How to avoid:** Keep blur values to `blur-sm` (4px) for light fog and `blur-md` (12px) for heavy fog. Limit fog overlays to 2 per market card. On the homepage grid, only 6-9 cards are visible at once, keeping total blur layers manageable. Test on actual mobile devices during development.
**Warning signs:** Scroll jank on iOS Safari, high GPU usage in Chrome DevTools Performance tab.

### Pitfall 2: oklch Gamut Mapping Across Displays
**What goes wrong:** oklch colors with high chroma values may render differently on standard sRGB displays vs P3 wide-gamut displays, causing the "emerald" to look different than intended.
**Why it happens:** oklch can specify colors outside the sRGB gamut. Browsers will gamut-map these back to sRGB, potentially shifting the perceived hue.
**How to avoid:** Keep chroma values moderate (0.02-0.15 range for the forest palette). Test colors on both sRGB and P3 displays. Use oklch.fyi or oklch.net to validate that chosen values are within sRGB gamut for critical UI colors (backgrounds, text, borders).
**Warning signs:** Colors look "off" or unexpectedly bright/dull on certain monitors.

### Pitfall 3: CSS Variable Resolution with @theme inline
**What goes wrong:** Using `@theme` (without `inline`) when referencing `:root` CSS variables causes the generated utility classes to emit `var(--color-primary)` literally, which may not resolve correctly in all contexts.
**Why it happens:** `@theme` creates CSS custom properties that reference other custom properties, creating a chain. `@theme inline` resolves the variable at build time, inlining the actual value.
**How to avoid:** Always use `@theme inline` when the token values reference other CSS variables (the existing pattern in `app.css`). This is already correctly configured in the project.
**Warning signs:** Colors appearing as transparent or wrong in utility classes like `bg-primary`.

### Pitfall 4: Fog Reveal Animation Not Smooth
**What goes wrong:** Animating `backdrop-filter: blur()` from a value to `blur(0)` can stutter because the browser must recalculate the blur convolution each frame.
**Why it happens:** Unlike opacity (which is GPU-composited), blur values changing per-frame trigger expensive pixel resampling.
**How to avoid:** Instead of animating the blur value itself, animate the fog overlay's `opacity` from 1 to 0 while simultaneously fading in the content underneath. The blur remains static (at its configured value) and disappears with the opacity fade. This approach is GPU-composited and smooth at 60fps.
**Warning signs:** Choppy reveal animation, DevTools showing long paint times during fog-clear.

### Pitfall 5: Tailwind v4 @theme Block Ordering
**What goes wrong:** Defining colors in `@theme inline` before `:root` CSS variables are declared causes undefined variable references.
**Why it happens:** CSS custom properties in `:root` must be declared before `@theme inline` references them. The existing `app.css` has the correct order (`:root` first, then `@theme inline`).
**How to avoid:** Maintain the existing file structure: `@import` → `:root` variables → `@theme inline` block → `@layer base` styles. Do not move blocks around.
**Warning signs:** All themed utility classes render as transparent/invisible.

### Pitfall 6: Accessible Motion Preferences
**What goes wrong:** Users with `prefers-reduced-motion` set see distracting fog drift animations and reveal transitions that cause discomfort.
**Why it happens:** CSS animations play by default regardless of user motion preferences.
**How to avoid:** Wrap all motion in Tailwind's `motion-safe:` variant. The fog drift animation should only apply with `motion-safe:animate-fog-drift`. The reveal animation should still function but with instant opacity change (no duration) under `motion-reduce:`.
**Warning signs:** No `motion-safe:` or `motion-reduce:` variants in animation classes.

## Code Examples

Verified patterns from official sources and project analysis:

### Forest Palette oklch Values (Replacing shadcn Blue-Gray)
```css
/* Source: oklch.fyi color picker + existing app.css structure */
/* Hue ~160 = emerald/forest green, ~85 = gold, ~155 = sage/moss */
:root {
  /* Background surfaces */
  --background: oklch(0.13 0.02 160);        /* #0f1a14 range -- dark forest floor */
  --foreground: oklch(0.93 0.01 155);        /* warm off-white */
  --card: oklch(0.17 0.025 158);             /* #152019 range -- lifted surface */
  --card-foreground: oklch(0.93 0.01 155);
  --popover: oklch(0.17 0.025 158);
  --popover-foreground: oklch(0.93 0.01 155);

  /* Primary: deep emerald */
  --primary: oklch(0.55 0.12 160);           /* rich emerald for primary buttons/links */
  --primary-foreground: oklch(0.98 0.005 160);

  /* Secondary: sage/moss */
  --secondary: oklch(0.25 0.04 155);
  --secondary-foreground: oklch(0.85 0.03 155);

  /* Muted: forest undertone */
  --muted: oklch(0.22 0.03 155);
  --muted-foreground: oklch(0.60 0.04 155);

  /* Accent: muted gold (aged brass) */
  --accent: oklch(0.68 0.12 85);
  --accent-foreground: oklch(0.15 0.02 85);

  /* Destructive: muted red (preserved from original) */
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);

  /* Borders and inputs: sage-tinted */
  --border: oklch(0.25 0.03 155);
  --input: oklch(0.22 0.03 155);
  --ring: oklch(0.45 0.08 160);

  /* Chart colors: forest/gold themed */
  --chart-1: oklch(0.55 0.12 160);           /* emerald */
  --chart-2: oklch(0.68 0.12 85);            /* gold */
  --chart-3: oklch(0.50 0.08 155);           /* sage */
  --chart-4: oklch(0.60 0.10 135);           /* teal-green */
  --chart-5: oklch(0.55 0.06 45);            /* warm copper */

  --radius: 0.625rem;

  /* Sidebar: deeper forest */
  --sidebar: oklch(0.11 0.02 160);
  --sidebar-foreground: oklch(0.93 0.01 155);
  --sidebar-primary: oklch(0.55 0.12 160);
  --sidebar-primary-foreground: oklch(0.98 0.005 160);
  --sidebar-accent: oklch(0.22 0.04 155);
  --sidebar-accent-foreground: oklch(0.93 0.01 155);
  --sidebar-border: oklch(0.22 0.03 155);
  --sidebar-ring: oklch(0.45 0.08 160);
}
```

### Custom @keyframes for Fog Drift
```css
/* Source: Tailwind v4 @theme animation docs */
/* Add to @theme inline block in app.css */
@theme inline {
  /* ... existing color tokens ... */

  /* Custom fog colors */
  --color-fog-heavy: oklch(0.15 0.03 160 / 0.85);
  --color-fog-light: oklch(0.20 0.04 155 / 0.55);

  /* Fog drift animation */
  --animate-fog-drift: fog-drift 8s ease-in-out infinite;

  @keyframes fog-drift {
    0%, 100% {
      background-position: 0% 50%;
      opacity: 0.7;
    }
    50% {
      background-position: 100% 50%;
      opacity: 0.9;
    }
  }
}
```

### Fog Reveal Using tw-animate-css Composition
```tsx
// Source: tw-animate-css documentation (GitHub)
// Compose fade + blur for fog-clear effect
<div
  className={cn(
    revealed
      ? 'animate-out fade-out blur-out duration-700 ease-out fill-mode-forwards'
      : 'animate-in fade-in blur-in duration-300',
  )}
>
  {/* Fog overlay content */}
</div>
```

### Responsive Market Grid Layout
```tsx
// Source: Tailwind CSS responsive grid docs
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {markets.map((market) => (
    <Link key={market.id} to={`/market/${market.id}`}>
      <MarketCard {...market} />
    </Link>
  ))}
</div>
```

### Category Tabs with Gold Active Indicator
```tsx
// Source: radix-ui Tabs + Tailwind styling
import * as Tabs from 'radix-ui/Tabs'

const categories = ['All', 'Politics', 'Crypto', 'Sports', 'Culture', 'Economics']

<Tabs.Root defaultValue="All">
  <Tabs.List className="flex gap-1 border-b border-border">
    {categories.map((cat) => (
      <Tabs.Trigger
        key={cat}
        value={cat}
        className={cn(
          'px-4 py-2 text-sm font-medium text-muted-foreground',
          'transition-colors hover:text-foreground',
          'data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold'
        )}
      >
        {cat}
      </Tabs.Trigger>
    ))}
  </Tabs.List>
</Tabs.Root>
```

### Mock Data Structure
```typescript
// Source: Project requirements (BET-04, MKT-01, MKT-02)
export interface MockMarket {
  id: string
  question: string
  description: string
  category: 'Politics' | 'Crypto' | 'Sports' | 'Culture' | 'Economics'
  deadline: Date
  resolutionSource: string
  sentiment: 'Leaning Yes' | 'Even' | 'Leaning No'  // BET-04
  poolTotal: string       // e.g. "12,450 USDC"
  betCount: number
  status: 'live' | 'resolved'
  outcome?: 'yes' | 'no'  // only if resolved
}

export const MOCK_MARKETS: MockMarket[] = [
  {
    id: '1',
    question: 'Will Bitcoin exceed $150,000 by end of Q2 2026?',
    description: 'Resolves YES if BTC/USD spot price on any major exchange...',
    category: 'Crypto',
    deadline: new Date('2026-06-30T23:59:59Z'),
    resolutionSource: 'CoinGecko BTC/USD',
    sentiment: 'Leaning Yes',
    poolTotal: '24,800 USDC',
    betCount: 142,
    status: 'live',
  },
  // ... more mock markets
]
```

### Bet Placement Form
```tsx
// Source: Project requirements (BET-01, BET-07)
<form className="space-y-4">
  <div className="space-y-2">
    <label className="text-sm font-medium text-foreground">
      Amount (USDC)
    </label>
    <div className="relative">
      <input
        type="number"
        min="1"
        step="1"
        placeholder="Min $1"
        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        USDC
      </span>
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3">
    <Button className="bg-gold text-gold-foreground hover:bg-gold/90">
      Yes
    </Button>
    <Button variant="secondary">
      No
    </Button>
  </div>
</form>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (JS) | @theme inline (CSS) | Tailwind v4, Jan 2025 | No build-time config; tokens are CSS custom properties natively |
| HSL color space | oklch color space | Tailwind v4, Jan 2025 | Perceptually uniform lightness; wider gamut; better for palette generation |
| tailwindcss-animate (plugin) | tw-animate-css (CSS import) | Tailwind v4, 2025 | No JS plugin needed; pure CSS animations compatible with v4 |
| PostCSS plugin pipeline | @tailwindcss/vite plugin | Tailwind v4, Jan 2025 | Direct Vite integration; no postcss.config needed (already in use) |
| RGB/hex colors | oklch() function | CSS Color Level 4, 2023+ | P3 gamut support; ~30% more colors on modern displays |

**Deprecated/outdated:**
- `tailwind.config.js` / `tailwind.config.ts`: Replaced by `@theme` blocks in CSS. The project correctly uses CSS-first approach.
- `tailwindcss-animate` plugin: Replaced by `tw-animate-css` CSS import for v4 compatibility. Already migrated in this project.
- `-webkit-backdrop-filter` prefix: No longer needed for modern browsers (Chrome 76+, Safari 9+, Firefox 103+). ~95% global support as of 2025.

## Open Questions

1. **Exact oklch values need visual validation**
   - What we know: The hue ranges are correct (~160 for emerald, ~85 for gold, ~155 for sage). Lightness and chroma values are estimated based on the user's hex range hints (#0f1a14, #152019, #1a2b22).
   - What's unclear: The precise oklch values that match the user's vision of "deep emerald gemstone" and "aged brass" gold may need visual tuning.
   - Recommendation: Implement the estimated values first, then tune interactively using browser DevTools. Use oklch.fyi to convert between hex and oklch if needed. The token architecture makes tuning a single-file change.

2. **Fog drift animation performance with many cards**
   - What we know: CSS `animation` on gradient `background-position` is GPU-friendly. Each card has 2 fog overlays = up to 18 animated gradients on a full 3x3 grid.
   - What's unclear: Whether 18 simultaneous CSS gradient animations cause frame drops on low-end mobile devices.
   - Recommendation: Test on real mobile devices. If needed, disable drift animation on cards not in viewport using Intersection Observer, or simplify to opacity-only pulsing (cheaper than position shift).

3. **Market detail sidebar sticky positioning**
   - What we know: The bet placement panel should be "sticky on right" per user decision. CSS `position: sticky` with `top` value handles this.
   - What's unclear: Interaction with the sticky header (which also uses `position: sticky`). Both need different `top` values to avoid overlap.
   - Recommendation: Set header `z-50` (already set), bet panel `sticky top-[calc(var(--header-height)+1rem)]` with a CSS variable for header height.

## Sources

### Primary (HIGH confidence)
- Tailwind CSS v4 Theme Docs (https://tailwindcss.com/docs/theme) - @theme inline syntax, --color-* namespacing, @keyframes in @theme, oklch values
- Tailwind CSS v4 Customizing Colors (https://tailwindcss.com/docs/customizing-colors) - Custom palette override, namespace initial, --alpha() function
- Tailwind CSS v4 Animation Docs (https://tailwindcss.com/docs/animation) - Custom animations with @theme, motion-safe variant
- tw-animate-css GitHub (https://github.com/Wombosvideo/tw-animate-css) - animate-in/out, fade-in/out, blur-in/out composition
- Chrome DevRel: Animating a Blur (https://developer.chrome.com/blog/animated-blur) - Performance guidance: animate opacity not blur, pre-compute stages
- MDN backdrop-filter (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) - Browser support, syntax, performance characteristics

### Secondary (MEDIUM confidence)
- Glassmorphism Implementation Guide 2025 (https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide) - Frosted glass best practices, blur value ranges
- oklch.fyi (https://oklch.fyi) - oklch color picker for value validation
- Evil Martians oklch Guide (https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) - oklch benefits over HSL, gamut considerations
- Josh W. Comeau backdrop-filter (https://www.joshwcomeau.com/css/backdrop-filter/) - Advanced frosted glass patterns

### Tertiary (LOW confidence)
- None -- all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in package.json; versions confirmed
- Architecture: HIGH - Patterns follow established project conventions (CVA, cn(), @theme inline, file-based routing)
- Pitfalls: HIGH - Backdrop-filter performance documented by Chrome DevRel; oklch gamut mapping documented by Evil Martians; @theme inline behavior verified in Tailwind v4 official docs

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain; Tailwind v4 is mature, CSS specs are settled)
