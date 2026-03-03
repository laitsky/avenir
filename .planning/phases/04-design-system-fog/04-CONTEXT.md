# Phase 4: Design System & Fog - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the forest/fog design system with reusable tokens, components, and fog gradient primitives — all using mock data so it doesn't depend on on-chain work. Design tokens in Tailwind v4 @theme, fog gradient component with configurable density and reveal animation, market card/detail/bet placement components with mock data, and layout shells for homepage feed, detail page, and portfolio page.

</domain>

<decisions>
## Implementation Decisions

### Color palette
- Primary: deep emerald green — rich, jewel-toned, slightly blue-green (think dark emerald gemstone)
- Background: warm charcoal with green undertone — dark forest floor at night (#0f1a14 range), not pure black
- Card/surface backgrounds: slightly lifted from base (#152019, #1a2b22 range) for depth
- Accent: muted gold — aged brass feel, not shiny/flashy. Used for primary CTAs, bet amounts, active indicators
- Secondary: sage/moss tones for supporting UI elements (Claude's discretion on exact usage — borders, muted text, inactive states, etc.)
- Replace current shadcn default blue-gray oklch palette (~285 hue) with forest-tinted oklch values

### Fog visual treatment
- CSS backdrop-blur + semi-transparent emerald/sage gradient overlay — "frosted glass" effect
- Two density levels:
  - Heavy fog: fully hidden values (pool totals, encrypted amounts) — more blur, more opacity
  - Light fog: partially revealed info (sentiment buckets) — less blur, more translucent
- Subtle drift motion while idle — slow gradient shift or gentle pulsing to show data is "alive but hidden"
- Fog component should accept density prop (heavy/light) for reuse across different data types

### Fog-clear reveal animation
- Dissolve outward from center — mist clearing effect
- Duration: ~700ms with ease-out easing
- Fog opacity + blur reduce simultaneously as the underlying value fades in
- Triggered programmatically (simulated with mock data in this phase, wired to real resolution in Phase 7)

### Market card composition
- Rich card layout with 6 elements: category tag, deadline countdown, question text, fogged sentiment, fogged pool total, bet count, Yes/No quick-bet buttons
- Fog applied to TWO areas per card: sentiment bucket area (light fog) and pool total area (heavy fog)
- Resolved market cards: fog cleared, actual numbers visible, green/red outcome badge (Yes won / No won)
- Cards are clickable — navigate to market detail page

### Market detail page
- Sidebar panel layout: market info/description on left, bet placement form sticky on right
- Bet placement panel: amount input (USDC), Yes button (gold accent), No button (muted/secondary)
- Market info section: question, description, resolution source, deadline countdown, category, fogged sentiment, fogged pool totals

### Homepage feed layout
- Responsive card grid: 3 columns desktop, 2 columns tablet, 1 column mobile
- Category navigation: horizontal tab bar (All | Politics | Crypto | Sports | Culture | Economics)
- Active category tab highlighted with gold accent
- Sorting options: trending, newest, ending soon
- Polymarket-inspired feel — clean, minimal chrome, generous spacing, focused on readability

### Header/navigation
- Minimal single-bar header: logo (left), category tabs (center/left), wallet connect button (right)
- Sticky header with backdrop blur (existing pattern preserved)
- Search deferred to Phase 9

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

</decisions>

<specifics>
## Specific Ideas

- Reference feel: Polymarket's clean/modern tile layout — but with emerald/gold premium skin and fog effects
- "Old money tech" aesthetic — sophisticated, not flashy
- Fog is THE visual metaphor for privacy — "data under the canopy"
- Gold accent specifically for: primary CTA buttons, bet amounts/payouts, active category tab indicator, important numbers
- Resolved cards should feel visually "completed" — fog gone, outcome clear, in contrast to live foggy cards
- Two fogged elements per live market card creates a visual rhythm that communicates "encrypted data here"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` component (`app/src/components/ui/button.tsx`): CVA-based with variants (default, outline, ghost, etc.) and sizes — extend with forest theme colors
- `Header` component (`app/src/components/Header.tsx`): Basic nav with logo, links, wallet connect placeholder — needs category tabs added
- `cn()` utility (`app/src/lib/utils.ts`): Tailwind class merging — standard pattern for all new components
- shadcn/ui integration: Already configured with `@theme inline` block — new components follow same pattern

### Established Patterns
- Tailwind v4 with `@theme inline` block in `app.css` for design tokens (CSS custom properties)
- oklch color space for all color definitions
- File-based routing with TanStack Router (`app/src/routes/`)
- `#/` import alias for app source paths
- Dark-first theme (no light/dark toggle)

### Integration Points
- `app/src/styles/app.css`: Replace current shadcn blue-gray palette with forest/fog tokens
- Route shells already exist: `index.tsx` (homepage), `market/$id.tsx` (detail), `portfolio.tsx` — need content
- `__root.tsx`: Root layout with Header, main container, Scripts — container may need adjustment for sidebar layout on detail page
- New components go in `app/src/components/` (ui/ for primitives, feature-named for composed components)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-design-system-fog*
*Context gathered: 2026-03-03*
