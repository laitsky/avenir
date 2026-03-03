---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [tanstack-start, tailwind-v4, shadcn-ui, react, vite, solana-web3js, anchor-client]

# Dependency graph
requires:
  - phase: 01-foundation/01
    provides: "Anchor project structure at repo root with programs/ and encrypted-ixs/"
provides:
  - "TanStack Start frontend shell in app/ with Vite-based config"
  - "File-based routing: / (homepage), /market/$id (market detail), /portfolio"
  - "Header component with nav links and wallet connect placeholder (shadcn/ui Button)"
  - "Tailwind v4 CSS-first configuration with @theme tokens (dark-first)"
  - "shadcn/ui integration with Button component and cn() utility"
  - "Solana client deps: @solana/web3.js@1, @coral-xyz/anchor@0.32.1, @arcium-hq/client@0.5.2"
  - "TypeScript path aliases: @/*, @/idl -> ../target/idl/, @/types -> ../target/types/"
affects: [04-design-system, 07-core-ui-integration, 09-portfolio-search]

# Tech tracking
tech-stack:
  added: ["@tanstack/react-start ^1.132.0", "@tanstack/react-router ^1.132.0", "tailwindcss ^4.1.18", "@tailwindcss/vite ^4.1.18", "shadcn/ui (new-york style)", "@solana/web3.js 1.98.4", "@coral-xyz/anchor 0.32.1", "@arcium-hq/client 0.5.2", "react ^19.2.0", "vite ^7.1.7", "radix-ui", "class-variance-authority", "tailwind-merge", "lucide-react"]
  patterns: [file-based-routing, css-first-tailwind-v4, shadcn-ui-component-pattern, vite-tanstack-start-plugin]

key-files:
  created:
    - app/package.json
    - app/vite.config.ts
    - app/tsconfig.json
    - app/components.json
    - app/src/styles/app.css
    - app/src/router.tsx
    - app/src/routes/__root.tsx
    - app/src/routes/index.tsx
    - app/src/routes/market/$id.tsx
    - app/src/routes/portfolio.tsx
    - app/src/components/Header.tsx
    - app/src/components/ui/button.tsx
    - app/src/lib/utils.ts
  modified: []

key-decisions:
  - "Used bun create @tanstack/start@latest scaffold then customized (CLI created solid base with shadcn/ui pre-configured)"
  - "Moved styles from src/styles.css to src/styles/app.css for cleaner directory organization"
  - "Dark-first theme: root CSS variables use dark oklch values matching Avenir brand (no light/dark toggle for Phase 1)"
  - "Skipped postcss.config.js: Tailwind v4 with @tailwindcss/vite plugin handles CSS natively without PostCSS"
  - "Removed scaffold defaults (Footer, ThemeToggle, about route) to keep only Avenir-specific content"

patterns-established:
  - "Route pattern: createFileRoute with named component function"
  - "Layout pattern: createRootRoute with shellComponent/component rendering Header + Outlet"
  - "CSS-first Tailwind v4: @import 'tailwindcss' + @theme inline tokens, NO tailwind.config.js"
  - "shadcn/ui component pattern: #/ path alias for imports, cn() utility for class merging"
  - "Placeholder page pattern: section with heading + muted description for future content areas"

requirements-completed: [INF-05]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 1 Plan 2: TanStack Start Frontend Scaffold Summary

**TanStack Start app with file-based routing (3 routes), Tailwind v4 dark theme, shadcn/ui Button, and Solana client deps installed**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-03T00:34:40Z
- **Completed:** 2026-03-03T00:40:13Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- TanStack Start frontend shell running in app/ with Vite-based config (tanstackStart + tailwindcss plugins)
- File-based routing verified via SSR: homepage (/), market detail with dynamic param (/market/$id), portfolio (/portfolio)
- Header with Avenir branding, Home/Portfolio nav links, and shadcn/ui Connect Wallet button visible on all routes
- Tailwind v4 CSS-first config with @theme tokens applied (dark background, light foreground)
- Solana client dependencies installed and compatible: @solana/web3.js@1.98.4, @coral-xyz/anchor@0.32.1, @arcium-hq/client@0.5.2

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Start project with Tailwind v4 and shadcn/ui** - `69cd1bf` (feat)
2. **Task 2: Create route shells and Header component** - `0354bb9` (feat)

## Files Created/Modified
- `app/package.json` - Frontend dependencies including TanStack Start, Tailwind v4, shadcn/ui, Solana client libs
- `app/vite.config.ts` - Vite config with tanstackStart(), tailwindcss(), devtools(), and react plugins
- `app/tsconfig.json` - TypeScript config with path aliases @/*, @/idl, @/types
- `app/components.json` - shadcn/ui configuration (new-york style, lucide icons)
- `app/src/styles/app.css` - Tailwind v4 CSS-first entry with @theme inline tokens (dark-first)
- `app/src/router.tsx` - TanStack Router setup with routeTree, scroll restoration, and preloading
- `app/src/routes/__root.tsx` - Root layout rendering Header, Outlet, and page metadata
- `app/src/routes/index.tsx` - Homepage with Avenir heading, subtitle, and market grid placeholder
- `app/src/routes/market/$id.tsx` - Market detail with dynamic id param, sentiment and bet placeholders
- `app/src/routes/portfolio.tsx` - Portfolio page with wallet connection prompt
- `app/src/components/Header.tsx` - Header with Avenir logo, nav links (Home, Portfolio), Connect Wallet button
- `app/src/components/ui/button.tsx` - shadcn/ui Button component with variants
- `app/src/lib/utils.ts` - cn() utility for Tailwind class merging

## Decisions Made
- Used `bun create @tanstack/start@latest app --tailwind --add-ons shadcn` scaffold and customized: The CLI generated a well-structured project with shadcn/ui, Tailwind v4, and Vite pre-configured, saving significant manual setup.
- Skipped postcss.config.js: Tailwind v4 + @tailwindcss/vite plugin processes CSS natively through Vite without needing PostCSS config. The plan listed this file but it is not required.
- Moved styles to `src/styles/app.css`: Better directory organization than the scaffold's `src/styles.css` flat location.
- Dark-first CSS theme: Root variables use dark oklch values without light/dark toggle. Phase 4 design system will add full theming.
- Removed scaffold defaults (Footer.tsx, ThemeToggle.tsx, about.tsx): These are TanStack Start starter boilerplate not needed for Avenir.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] postcss.config.js not needed with @tailwindcss/vite**
- **Found during:** Task 1 (Tailwind configuration)
- **Issue:** Plan listed postcss.config.js as a file to create, but @tailwindcss/vite plugin handles Tailwind processing natively in Vite without PostCSS
- **Fix:** Skipped postcss.config.js creation; build verified without it
- **Files modified:** None (file omitted)
- **Verification:** `bun run build` succeeds without PostCSS config
- **Committed in:** 69cd1bf

---

**Total deviations:** 1 (unnecessary file omitted)
**Impact on plan:** No impact. PostCSS config is genuinely unnecessary with the Vite plugin approach. Build and dev server work correctly without it.

## Issues Encountered
None -- scaffold CLI worked smoothly and customization was straightforward.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend shell complete, ready for Phase 4 (Design System & Fog) to add design tokens, component library, and theming
- Route structure ready for Phase 7 (Core UI Integration) to connect to live on-chain data
- Solana client deps installed, TypeScript path aliases configured for IDL consumption when Anchor builds generate types
- Note: Some uncommitted Arcium/Cargo changes in working tree from previous session (Arcium.toml, encrypted-ixs/, Cargo.toml) -- these are out of scope for this plan

## Self-Check: PASSED

All 13 created files verified present. All 2 task commits verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-03*
