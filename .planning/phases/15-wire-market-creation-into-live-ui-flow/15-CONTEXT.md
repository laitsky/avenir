# Phase 15: Wire Market Creation Into Live UI Flow - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose the existing `useCreateMarket` hook through a routed entrypoint so the shipped app can exercise the full create -> init_pool -> bet lifecycle. The hook and on-chain instructions already exist -- this phase wires them into the live UI with proper navigation, form, access gating, and post-creation flow.

</domain>

<decisions>
## Implementation Decisions

### Route & navigation
- Dedicated `/create` route (new file `app/src/routes/create.tsx`)
- Header nav link added alongside Markets and Portfolio -- visible only to whitelisted wallets
- Non-whitelisted or disconnected users who navigate directly to `/create` see appropriate gate messages (see Access gating below)

### Form fields & UX
- Single-column centered layout -- all fields stacked vertically in a focused card
- Fields: question (text input), resolution source (text input), category (dropdown select using existing CATEGORY_MAP), deadline (date-time picker for unix timestamp, must be >1h from now per on-chain validation)
- Submit button text reflects creation step progress: "Create Market" -> "Creating..." -> "Initializing pool..." -> "Confirming..." (uses `step` state from `useCreateMarket` hook)

### Access gating
- Client-side whitelist PDA check: fetch `["whitelist", wallet_pubkey]` PDA on wallet connect to determine if user can create markets
- Non-whitelisted wallet connected: fog-wrapped gate over the form -- form visible but obscured behind fog overlay with access-restricted message layered on top (uses fog metaphor consistent with encrypted data visual language)
- No wallet connected: "Connect your wallet to create markets" prompt with wallet connect button (can't check whitelist without wallet)

### Post-creation flow
- Auto-redirect to `/market/$id` on success (useCreateMarket returns marketId)
- One-at-a-time flow -- no "create another" button, user navigates back to /create if needed
- Inline retry state on the page for partial failure (create_market succeeded but init_pool failed after retries) -- shows error message with Retry button, supplements the existing toast

### Claude's Discretion
- Exact form styling, spacing, and typography within forest/fog design system
- Input validation patterns and error message copy
- Date-time picker library or native input approach
- Fog gate animation details

</decisions>

<specifics>
## Specific Ideas

- Fog-wrapped gate for non-whitelisted users mirrors the encrypted-data fog metaphor -- "this feature is hidden behind the canopy"
- Submit button step indicator keeps the UI minimal while providing maximum feedback during the multi-TX flow
- Header Create link only appearing for whitelisted wallets keeps navigation clean for regular bettors

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useCreateMarket` hook (`app/src/hooks/useCreateMarket.ts`): Fully implemented with create + auto-chain init_pool + exponential backoff retry + step state tracking
- `FogOverlay` component (`app/src/components/fog/FogOverlay.tsx`): Ready for fog-wrapped access gate
- `WalletButton` component (`app/src/components/wallet/WalletButton.tsx`): Ready for connect-wallet prompt
- `CATEGORY_MAP` constant (`app/src/lib/types.ts`): 5 categories (Politics, Crypto, Sports, Culture, Economics)
- `getConfigPda`, `getMarketPda`, `getMarketPoolPda`, `getVaultPda` helpers (`app/src/lib/pda.ts`)

### Established Patterns
- TanStack Router file-based routing: `/` (index.tsx), `/market/$id` ($id.tsx), `/portfolio` (portfolio.tsx)
- Hook-based domain logic with React Query for caching/polling
- Header nav uses `<Link>` with `activeProps` for active state styling
- Forest/fog design system: deep forest green, sage, muted gold accents, warm dark background

### Integration Points
- New route file: `app/src/routes/create.tsx`
- Header component: conditional "Create" link based on whitelist check
- Navigation after success: `useNavigate()` to `/market/${marketId}`
- Whitelist PDA check: new hook or inline fetch using existing `useAnchorProgram`

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 15-wire-market-creation-into-live-ui-flow*
*Context gathered: 2026-03-06*
