# Phase 7: Core UI Integration - Research

**Researched:** 2026-03-04
**Domain:** Solana wallet integration, on-chain data fetching, transaction flow, React/TanStack Start
**Confidence:** HIGH

## Summary

Phase 7 is the convergence phase -- connecting the existing fog-themed UI (Phase 4) to live on-chain data (Phases 2, 3, 5, 6). The frontend already has a complete component library (MarketCard, BetPlacement, MarketDetail, FogOverlay, CategoryTabs, CountdownTimer, Header) built against a `MockMarket` interface. The work is replacing mock data sources with on-chain account fetches, adding wallet connectivity, and wiring bet/resolve/claim transactions.

The standard Solana frontend stack is well-established: `@solana/wallet-adapter-react` for wallet connectivity, `@tanstack/react-query` for data fetching and caching, and `@coral-xyz/anchor` (already installed at 0.32.1) for typed program interaction. The project already has `@tanstack/react-router-ssr-query` installed, which handles TanStack Query + TanStack Start SSR integration. The primary risk is SSR hydration mismatch with wallet-dependent UI, mitigated by TanStack Start's `ClientOnly` component.

**Primary recommendation:** Use Solana wallet-adapter with Wallet Standard auto-detection (no per-wallet packages needed for Phantom/Solflare/Backpack), TanStack Query v5 for on-chain data fetching with polling/websocket refresh, and build a custom wallet modal that matches the existing fog design system.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use Solana wallet adapter library -- show all detected wallets in picker modal (standard adapter behavior)
- Connected state in header shows truncated address + USDC balance (e.g. "8xK3...mP9q · 142.50 USDC")
- Clicking connected wallet opens dropdown menu: copy address, view on Solscan, disconnect
- When wallet not connected and user clicks Bet Yes/No, open wallet connect modal (intercept bet action, return to bet after connecting)
- Multi-step progress indicator showing: "Encrypting..." -> "Submitting..." -> "Awaiting confirmation..."
- When MPC lock is active (another bet in-flight), show retry state: "Market busy -- retrying..." with attempt count
- On successful bet: toast notification "Bet placed: X USDC on Yes" with transaction link, non-blocking, auto-dismiss ~5s
- On failure: toast with error message and retry option
- Show user's existing position above bet form: "Your position: 50 USDC on Yes"
- Frontend auto-retry with exponential backoff (~2-3s intervals) for lock contention
- Homepage market feed: auto-poll every 15-30s to keep data fresh
- Market detail page: Solana account websocket subscription for real-time updates (sentiment, status changes)
- First page load: fog-themed loading state -- heavy fog fills grid area with "Loading markets..." text
- Sentiment update animation: subtle fog pulse when sentiment bucket changes
- Creator's resolve button replaces bet form in panel after deadline passes -- Yes/No outcome selector in same location
- compute_payouts is permissionless -- anyone can trigger after creator resolves (show "Reveal Payouts" button)
- Winners see prominent claim banner in bet panel area: "You won! Claim X USDC" with fog-clear animation
- Live fog-clear animation if user is on page when market finalizes -- fog dissolves in real-time
- Resolved markets visited later show fog already cleared, no animation
- Losers see subtle loss indicator: "Your position: 25 USDC on No -- Market resolved Yes" in muted/red text
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Homepage displays a tiled market feed with category tabs and sorting (trending, newest, ending soon) | TanStack Query useQuery hook fetches all Market accounts via `program.account.market.all()`, replaces MOCK_MARKETS. Existing MarketGrid + CategoryTabs components adapt to on-chain Market type. Auto-poll with refetchInterval: 15000-30000. |
| UX-02 | Market detail page shows question, description, deadline countdown, fog-wrapped sentiment, and bet placement interface | useQuery for single Market account fetch + websocket subscription via `connection.onAccountChange()`. Existing MarketDetail + BetPlacement components adapt to on-chain types. Bet form wires to place_bet instruction with Arcium encryption. |
| UX-03 | User can connect Solana wallet (Phantom, Solflare, Backpack) | @solana/wallet-adapter-react with Wallet Standard auto-detection. All three wallets support Wallet Standard, so no per-wallet adapter packages needed. Custom modal built with existing design system. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @solana/wallet-adapter-react | ^0.15.39 | React hooks for wallet state (useWallet, useConnection) | Official Solana wallet integration, used by virtually all Solana dApps |
| @solana/wallet-adapter-react-ui | ^0.9.35 | Pre-built wallet modal/button components (optional -- may build custom) | Provides WalletModalProvider and default modal; can skip CSS and build custom |
| @solana/wallet-adapter-base | ^0.9.23 | Base types and WalletAdapterNetwork enum | Required peer dependency for wallet-adapter-react |
| @tanstack/react-query | ^5.90 | Async state management, caching, polling | Already integrated via @tanstack/react-router-ssr-query (in package.json); standard for data fetching in React apps |
| @coral-xyz/anchor | 0.32.1 | Typed Solana program interaction (already installed) | Already in package.json; provides typed Program<Avenir> for all instruction calls |
| @solana/web3.js | ^1.x | Solana RPC client, Connection, PublicKey (already installed) | Already in package.json; v1 API used throughout test suite |
| @arcium-hq/client | 0.5.2 | Client-side encryption via x25519/RescueCipher (already installed) | Already in package.json; proven in Phase 3 test suite (client-encryption.ts) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.7 | Toast notifications | Bet success/failure toasts, transaction status. Default toast in shadcn/ui. Minimal setup: add `<Toaster />` to root, call `toast()` anywhere |
| @solana/spl-token | ^0.4.x | SPL Token account helpers (getAssociatedTokenAddress, getAccount) | Fetching user's USDC balance for header display and bet placement validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @solana/wallet-adapter-react-ui (default modal) | Custom modal with existing design system | Custom modal matches fog theme perfectly; default UI CSS clashes with dark forest theme. **Recommend custom** since we have Button, cn(), and the design tokens |
| sonner | react-hot-toast | Sonner is shadcn/ui default, already styled dark, 2KB smaller. Use sonner |
| Polling (refetchInterval) | WebSocket only | Homepage needs simple staleness refresh; WS for detail page where real-time matters. **Use both** per user decision |

**Installation:**
```bash
cd app && bun add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-base @tanstack/react-query @solana/spl-token sonner
```

Note: `@solana/wallet-adapter-wallets` is NOT needed -- Phantom, Solflare, and Backpack all support Wallet Standard and are auto-detected. Passing an empty `wallets={[]}` array to WalletProvider enables standard-only detection.

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── components/
│   ├── fog/              # FogOverlay (existing)
│   ├── layout/           # CategoryTabs, MarketGrid (adapt from MockMarket to Market)
│   ├── market/           # MarketCard, MarketDetail, BetPlacement, CountdownTimer (adapt)
│   ├── ui/               # button.tsx (existing), toast via sonner
│   └── wallet/           # NEW: WalletButton, WalletModal, WalletDropdown
├── hooks/                # NEW: useMarkets, useMarket, useUserPosition, useBet, useResolve, useClaim
├── lib/
│   ├── utils.ts          # cn() (existing)
│   ├── mock-data.ts      # DEPRECATED after Phase 7
│   ├── anchor.ts         # NEW: Program instance, IDL, connection helpers
│   ├── pda.ts            # NEW: PDA derivation (market, pool, position, vault)
│   ├── encryption.ts     # NEW: Browser-safe Arcium encryption wrapper
│   └── constants.ts      # NEW: Program ID, USDC mint, RPC endpoint, categories
├── routes/
│   ├── __root.tsx         # Add wallet + query providers
│   ├── index.tsx          # Replace MOCK_MARKETS with useMarkets() hook
│   ├── market/$id.tsx     # Replace mock lookup with useMarket(id) + WS subscription
│   └── portfolio.tsx      # Placeholder (Phase 9 scope)
├── router.tsx             # Add QueryClient + setupRouterSsrQueryIntegration
└── styles/
    └── app.css            # Existing theme (no changes needed)
```

### Pattern 1: TanStack Query + TanStack Start SSR Integration
**What:** Wire QueryClient into TanStack Router for SSR hydration
**When to use:** Required for all data fetching -- already have @tanstack/react-router-ssr-query installed

```typescript
// router.tsx
import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,       // 15s -- matches poll interval
        refetchOnWindowFocus: true,
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}
```

### Pattern 2: Wallet Provider Setup with ClientOnly SSR Guard
**What:** Wrap app with Solana wallet providers, guarding against SSR hydration mismatch
**When to use:** Root layout -- wallet state must be available everywhere

```typescript
// __root.tsx -- provider wrapping
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'

// In RootLayout component:
const endpoint = clusterApiUrl('devnet') // or custom RPC

<ConnectionProvider endpoint={endpoint}>
  <WalletProvider wallets={[]} autoConnect>
    <WalletModalProvider>
      <Header />
      <main>
        <Outlet />
      </main>
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

**SSR Guard:** TanStack Start renders on the server. Wallet libraries access `window` which doesn't exist in SSR. Use `ClientOnly` from `@tanstack/react-router` to wrap wallet-dependent components:

```typescript
import { ClientOnly } from '@tanstack/react-router'

// In Header:
<ClientOnly fallback={<button>Connect Wallet</button>}>
  {() => <WalletButton />}
</ClientOnly>
```

Alternatively, wrap the entire provider tree in ClientOnly if wallet state is only needed client-side.

### Pattern 3: On-Chain Data Fetching with Anchor + TanStack Query
**What:** Custom hooks that fetch and cache on-chain accounts
**When to use:** Every page that reads blockchain state

```typescript
// hooks/useMarkets.ts
import { useQuery } from '@tanstack/react-query'
import { useAnchorProgram } from '#/lib/anchor'

export function useMarkets() {
  const program = useAnchorProgram()

  return useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const markets = await program.account.market.all()
      return markets.map(m => ({
        publicKey: m.publicKey,
        ...m.account,
      }))
    },
    refetchInterval: 20_000, // Poll every 20s (within 15-30s range)
    enabled: !!program,
  })
}

// hooks/useMarket.ts
export function useMarket(marketId: number) {
  const program = useAnchorProgram()
  const { connection } = useConnection()

  const query = useQuery({
    queryKey: ['market', marketId],
    queryFn: async () => {
      const [marketPda] = getMarketPda(marketId, program.programId)
      return program.account.market.fetch(marketPda)
    },
    enabled: !!program,
  })

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!connection || !marketId) return
    const [marketPda] = getMarketPda(marketId, program.programId)
    const subId = connection.onAccountChange(marketPda, () => {
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
    })
    return () => { connection.removeAccountChangeListener(subId) }
  }, [connection, marketId])

  return query
}
```

### Pattern 4: Bet Transaction Flow (Encrypt -> Submit -> Await)
**What:** Multi-step transaction with Arcium encryption
**When to use:** BetPlacement component when user clicks "Bet Yes" or "Bet No"

```typescript
// hooks/usePlaceBet.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RescueCipher, x25519, getMXEPublicKey, deserializeLE } from '@arcium-hq/client'

type BetStep = 'idle' | 'encrypting' | 'submitting' | 'confirming' | 'retrying' | 'success' | 'error'

export function usePlaceBet(marketId: number) {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<BetStep>('idle')
  const [retryCount, setRetryCount] = useState(0)

  const mutation = useMutation({
    mutationFn: async ({ amount, isYes }: { amount: number; isYes: boolean }) => {
      // Step 1: Encrypt
      setStep('encrypting')
      const mxePublicKey = await getMXEPublicKey(/* ... */)
      const privateKey = x25519.utils.randomPrivateKey()
      const publicKeyBytes = x25519.getPublicKey(privateKey)
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey)
      const cipher = new RescueCipher(sharedSecret)

      // Use crypto.getRandomValues for browser-safe nonce
      const nonce = new Uint8Array(16)
      crypto.getRandomValues(nonce)

      const isYesCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce)
      const amountCiphertext = cipher.encrypt([BigInt(amount)], nonce)

      // Step 2: Submit
      setStep('submitting')
      const tx = await program.methods
        .placeBet(/* args */)
        .accounts(/* accounts */)
        .transaction()

      const sig = await sendTransaction(tx, connection)

      // Step 3: Confirm
      setStep('confirming')
      await connection.confirmTransaction(sig, 'confirmed')

      setStep('success')
      return sig
    },
    onSuccess: (sig) => {
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
      queryClient.invalidateQueries({ queryKey: ['position', marketId] })
      toast.success(`Bet placed: ${amount} USDC on ${isYes ? 'Yes' : 'No'}`, {
        action: { label: 'View', onClick: () => window.open(`https://solscan.io/tx/${sig}`) }
      })
    },
    onError: (err) => {
      if (isMpcLockError(err)) {
        setStep('retrying')
        // Exponential backoff retry
      }
    },
  })

  return { ...mutation, step, retryCount }
}
```

### Pattern 5: PDA Derivation Utilities
**What:** TypeScript helpers matching on-chain PDA seeds
**When to use:** Every account fetch or instruction call

```typescript
// lib/pda.ts
import { PublicKey } from '@solana/web3.js'

const PROGRAM_ID = new PublicKey('PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN')

function marketIdBuffer(id: number): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(BigInt(id))
  return buf
}

export const getMarketPda = (id: number) =>
  PublicKey.findProgramAddressSync([Buffer.from('market'), marketIdBuffer(id)], PROGRAM_ID)

export const getMarketPoolPda = (id: number) =>
  PublicKey.findProgramAddressSync([Buffer.from('market_pool'), marketIdBuffer(id)], PROGRAM_ID)

export const getVaultPda = (id: number) =>
  PublicKey.findProgramAddressSync([Buffer.from('vault'), marketIdBuffer(id)], PROGRAM_ID)

export const getPositionPda = (marketId: number, user: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from('position'), marketIdBuffer(marketId), user.toBuffer()],
    PROGRAM_ID
  )

export const getConfigPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)
```

### Pattern 6: On-Chain Market Type Mapping
**What:** Map Anchor-decoded Market account to UI-friendly types
**When to use:** After fetching accounts, before rendering

```typescript
// lib/types.ts
export interface OnChainMarket {
  publicKey: PublicKey
  id: number              // u64 -> number (BN.toNumber())
  question: string
  resolutionSource: string
  category: number        // 0=Politics, 1=Crypto, 2=Sports, 3=Culture, 4=Economics
  resolutionTime: number  // Unix timestamp (BN.toNumber())
  state: number           // 0=Open, 1=Locked, 2=Resolved, 3=Disputed, 4=Finalized
  winningOutcome: number  // 0=None, 1=Yes, 2=No
  sentiment: number       // 0=Unknown, 1=LeaningYes, 2=Even, 3=LeaningNo
  totalBets: number       // u64 -> number
  creator: PublicKey
  createdAt: number       // Unix timestamp
  mpcLock: boolean
  revealedYesPool: number // u64 -> number (only set after Finalized)
  revealedNoPool: number  // u64 -> number (only set after Finalized)
}

export const CATEGORY_MAP: Record<number, string> = {
  0: 'Politics',
  1: 'Crypto',
  2: 'Sports',
  3: 'Culture',
  4: 'Economics',
}

export const SENTIMENT_MAP: Record<number, string> = {
  0: 'Unknown',
  1: 'Leaning Yes',
  2: 'Even',
  3: 'Leaning No',
}

export const STATE_MAP: Record<number, string> = {
  0: 'Open',     // -> 'live' in UI
  1: 'Locked',   // -> 'live' in UI (MPC in flight)
  2: 'Resolved', // -> 'resolved' in UI (awaiting compute_payouts)
  3: 'Disputed', // Phase 8 scope
  4: 'Finalized', // -> 'resolved' with revealed pools
}
```

### Anti-Patterns to Avoid
- **SSR-rendering wallet state:** Never render wallet-dependent UI on the server. Always use ClientOnly or useHydrated guards. Wallet state is inherently client-only.
- **Fetching all accounts without filters:** `program.account.market.all()` works for small numbers of markets. For scale, add memcmp filters. But v1 with < 100 markets is fine.
- **Ignoring subscription cleanup:** Always return cleanup functions from useEffect with onAccountChange. Leaked subscriptions cause memory issues and stale callbacks.
- **Using `crypto.randomBytes` in browser:** Node.js crypto module is not available in Vite browser builds. Use `crypto.getRandomValues(new Uint8Array(16))` instead.
- **Re-creating Program instance on every render:** Create Program in a context/provider once and share via hook.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wallet connection state machine | Custom wallet state management | @solana/wallet-adapter-react useWallet() | Handles 5+ wallet types, auto-connect, event listeners, disconnect, error states |
| Query caching and deduplication | Custom cache for RPC responses | @tanstack/react-query | Handles stale-while-revalidate, background refetch, deduplication, error retry |
| x25519 key exchange | Custom crypto implementation | @arcium-hq/client (x25519, RescueCipher) | Already proven in test suite; cryptographic code must not be hand-rolled |
| PDA derivation | Inline PublicKey.findProgramAddressSync everywhere | Centralized pda.ts helpers | PDA seeds must match on-chain exactly; single source of truth prevents bugs |
| Transaction confirmation | Custom polling for tx status | connection.confirmTransaction() | Built into @solana/web3.js; handles WebSocket or polling, timeout, error cases |
| Toast notifications | Custom notification component | sonner (shadcn/ui default) | 2KB, dark theme support, auto-dismiss, action buttons, accessible |

**Key insight:** The integration layer is mostly plumbing -- connecting existing UI components to existing on-chain logic through well-established libraries. The risk is in the seams (SSR hydration, browser crypto, type mapping), not in the core logic.

## Common Pitfalls

### Pitfall 1: SSR Hydration Mismatch with Wallet State
**What goes wrong:** Server renders "Connect Wallet" button but client renders wallet-connected UI with address. React hydration throws errors.
**Why it happens:** Wallet adapter detects installed wallets and auto-connects on client. Server has no wallet context. TanStack Start SSR renders the component tree on the server first.
**How to avoid:** Wrap wallet-dependent UI in `ClientOnly` from @tanstack/react-router. Alternatively, use the `useHydrated()` hook from TanStack Start. For the wallet provider itself, consider wrapping the entire ConnectionProvider+WalletProvider tree in ClientOnly -- wallet state is never needed on the server.
**Warning signs:** "Hydration failed because the initial UI does not match" error in console.

### Pitfall 2: Node.js crypto Module in Browser
**What goes wrong:** `import { randomBytes } from 'crypto'` fails in Vite browser build with "Module 'crypto' has been externalized for browser compatibility."
**Why it happens:** @arcium-hq/client test helpers import Node.js `crypto.randomBytes`. The library itself may use it internally. Vite strips Node.js builtins in browser mode.
**How to avoid:** Use Web Crypto API: `crypto.getRandomValues(new Uint8Array(16))` for nonce generation. The @arcium-hq/client library should work in browser since its core operations (x25519, RescueCipher) are pure JS. The `randomBytes` calls are only needed in test helpers, not the library internals. Validate by importing only `{ RescueCipher, x25519, getMXEPublicKey, deserializeLE }` -- not `randomBytes`.
**Warning signs:** Vite build warnings about externalized modules; runtime TypeError for randomBytes.

### Pitfall 3: BN.js to Number Conversion for Large Values
**What goes wrong:** Anchor returns BN (Big Number) objects for u64 fields. Calling `.toNumber()` on values > Number.MAX_SAFE_INTEGER throws.
**Why it happens:** USDC amounts in lamports (1 USDC = 1,000,000) and market IDs are u64. Pool totals could exceed 2^53.
**How to avoid:** For display, convert to USDC decimal via `bn.toNumber() / 1_000_000` for amounts under ~9 trillion USDC (safe). For market IDs, `.toNumber()` is safe (sequential counter). For large pool display, use `bn.toString()` and format manually.
**Warning signs:** "Number exceeds MAX_SAFE_INTEGER" runtime error.

### Pitfall 4: Stale WebSocket Subscriptions
**What goes wrong:** Navigating away from market detail page without cleanup leaves dangling onAccountChange listeners. Callbacks fire on unmounted components.
**Why it happens:** React useEffect cleanup not properly implemented, or subscription ID not stored.
**How to avoid:** Store subscription ID from `connection.onAccountChange()` and call `connection.removeAccountChangeListener(subId)` in useEffect cleanup. Use TanStack Query's `queryClient.invalidateQueries()` in the callback instead of setState to avoid stale closure issues.
**Warning signs:** Console warnings about updates on unmounted components; increasing memory usage.

### Pitfall 5: MPC Lock Contention in UI
**What goes wrong:** User clicks "Bet Yes", gets MarketLocked error because another bet is being processed. User sees confusing error.
**Why it happens:** Sequential MPC lock means only one bet processes at a time per market. Lock held during MPC computation (~2-10s).
**How to avoid:** Check `market.mpcLock` before submitting. If locked, show "Market busy -- retrying..." UI immediately. Implement exponential backoff: 2s, 4s, 8s with max 5 attempts. Read the mpc_lock field from the on-chain account before each retry.
**Warning signs:** Repeated transaction failures with "Market is locked for MPC computation" error.

### Pitfall 6: Missing Wallet Interceptor for Bet Actions
**What goes wrong:** User clicks "Bet Yes" without wallet connected, nothing happens. Silent failure.
**Why it happens:** Bet form is visible to all users, but transaction requires a connected wallet.
**How to avoid:** In BetPlacement, check `useWallet().connected`. If not connected, clicking "Bet Yes/No" should open wallet modal via `useWalletModal().setVisible(true)`. After wallet connects, auto-return to bet form. Store intended bet action in state and execute after wallet connects.
**Warning signs:** Users clicking bet buttons with no response.

### Pitfall 7: Incorrect IDL Import Path in Frontend
**What goes wrong:** Frontend cannot find IDL file or types. Build fails with module resolution error.
**Why it happens:** IDL lives at `target/idl/avenir.json` and types at `target/types/avenir.ts` -- outside the `app/` directory. Vite's module resolution may not reach outside the app root.
**How to avoid:** Copy IDL JSON into `app/src/lib/idl/avenir.json` (or configure Vite alias). Import the TypeScript type from `target/types/avenir.ts` or copy it into app/src. Use the `#/` import alias for consistency.
**Warning signs:** "Cannot find module" errors for IDL imports.

## Code Examples

Verified patterns from official sources and existing project code:

### Anchor Program Instance (Browser)
```typescript
// lib/anchor.ts
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useMemo } from 'react'
import type { Avenir } from '#/lib/idl/avenir' // Copy from target/types/
import idl from '#/lib/idl/avenir.json'

export function useAnchorProgram(): Program<Avenir> | null {
  const { connection } = useConnection()
  const wallet = useWallet()

  return useMemo(() => {
    if (!wallet.publicKey) return null
    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: 'confirmed',
    })
    return new Program<Avenir>(idl as any, provider)
  }, [connection, wallet.publicKey])
}

// For read-only operations (no wallet needed):
export function useReadOnlyProgram(): Program<Avenir> {
  const { connection } = useConnection()

  return useMemo(() => {
    // Read-only provider with no wallet
    const provider = new AnchorProvider(connection, {} as any, {
      commitment: 'confirmed',
    })
    return new Program<Avenir>(idl as any, provider)
  }, [connection])
}
```
Source: Anchor TypeScript docs, adapted for wallet-adapter pattern

### Browser-Safe Encryption
```typescript
// lib/encryption.ts
import { RescueCipher, x25519, getMXEPublicKey, deserializeLE } from '@arcium-hq/client'

export async function encryptBetForMPC(
  provider: AnchorProvider,
  programId: PublicKey,
  isYes: boolean,
  amount: number
) {
  // 1. Get MXE public key
  const mxePublicKey = await getMXEPublicKey(provider, programId)
  if (!mxePublicKey) throw new Error('Failed to get MXE public key')

  // 2. Generate x25519 keypair
  const privateKey = x25519.utils.randomPrivateKey() // Uses crypto.getRandomValues internally
  const publicKey = x25519.getPublicKey(privateKey)

  // 3. Derive shared secret
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey)
  const cipher = new RescueCipher(sharedSecret)

  // 4. Browser-safe nonce generation
  const nonce = new Uint8Array(16)
  crypto.getRandomValues(nonce) // Web Crypto API, NOT Node.js crypto

  // 5. Encrypt fields separately (matching update_pool circuit expectations)
  const isYesCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce)
  const amountCiphertext = cipher.encrypt([BigInt(amount)], nonce)

  return {
    isYesCiphertext: isYesCiphertext[0],      // Uint8Array[32]
    amountCiphertext: amountCiphertext[0],     // Uint8Array[32]
    publicKey,                                  // Uint8Array[32]
    nonce,
    nonceBN: deserializeLE(nonce),             // For passing to Anchor as u128
  }
}
```
Source: Existing tests/mpc/client-encryption.ts and tests/mpc/helpers.ts, adapted for browser

### User USDC Balance in Header
```typescript
// hooks/useUsdcBalance.ts
import { useQuery } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { USDC_MINT } from '#/lib/constants'

export function useUsdcBalance() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['usdc-balance', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0
      const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      try {
        const account = await getAccount(connection, ata)
        return Number(account.amount) / 1_000_000 // USDC has 6 decimals
      } catch {
        return 0 // No ATA = 0 balance
      }
    },
    enabled: !!publicKey,
    refetchInterval: 30_000,
  })
}
```

### Wallet Modal Intercept Pattern
```typescript
// In BetPlacement component:
const { connected } = useWallet()
const { setVisible } = useWalletModal()
const [pendingBet, setPendingBet] = useState<{ amount: number; isYes: boolean } | null>(null)

function handleBet(isYes: boolean) {
  if (!connected) {
    setPendingBet({ amount, isYes })
    setVisible(true) // Opens wallet modal
    return
  }
  executeBet(amount, isYes)
}

// Listen for wallet connection to execute pending bet
useEffect(() => {
  if (connected && pendingBet) {
    executeBet(pendingBet.amount, pendingBet.isYes)
    setPendingBet(null)
  }
}, [connected, pendingBet])
```

### Resolution/Claim UI State Machine
```typescript
// Determine which UI to show in bet panel area:
function getBetPanelMode(market: OnChainMarket, position?: UserPosition, wallet?: PublicKey) {
  const isCreator = wallet && market.creator.equals(wallet)
  const deadlinePassed = market.resolutionTime < Date.now() / 1000

  if (market.state === 4) {  // Finalized
    if (!position) return 'resolved-no-position'  // Non-bettor view
    if (position.claimed) return 'claimed'
    const isWinner = (market.winningOutcome === 1 && position.yesAmount > 0)
                  || (market.winningOutcome === 2 && position.noAmount > 0)
    return isWinner ? 'claim-payout' : 'lost'
  }

  if (market.state === 2) {  // Resolved, needs compute_payouts
    return 'reveal-payouts'  // Show "Reveal Payouts" button (permissionless)
  }

  if (market.state === 0 && deadlinePassed && isCreator) {
    return 'resolve'  // Creator resolves
  }

  if (market.state === 0 && !deadlinePassed) {
    return 'bet'  // Normal bet form
  }

  return 'expired'  // Deadline passed, not creator, not resolved
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual wallet adapter packages per wallet | Wallet Standard auto-detection (empty wallets array) | 2023+ | No per-wallet packages needed for Phantom/Solflare/Backpack; less supply chain risk |
| react-query v3/v4 | TanStack Query v5 | 2023 | Simplified API, 20% smaller, better SSR streaming |
| Manual QueryClientProvider wrapping | setupRouterSsrQueryIntegration | 2024+ | Auto-hydration/dehydration with TanStack Router |
| @solana/web3.js v2 (new API) | @solana/web3.js v1 (legacy) | Ongoing | v2 exists but Anchor 0.32 and wallet-adapter still target v1. Project uses v1 throughout |
| Custom AnchorProvider.env() | AnchorProvider with wallet adapter | Standard | Browser requires wallet-adapter provider instead of env() |

**Deprecated/outdated:**
- `@solana/wallet-adapter-wallets` individual imports: Not needed for Wallet Standard-compliant wallets (Phantom, Solflare, Backpack all comply). Only needed for legacy wallets.
- `WalletMultiButton` default styling: Clashes with custom dark themes. Build custom wallet button with useWallet() hook instead.

## Open Questions

1. **@arcium-hq/client Browser Bundle Size and Compatibility**
   - What we know: The library works in Node.js (proven in test suite). Its core crypto (x25519, RescueCipher) appears to be pure JS via noble-curves.
   - What's unclear: Whether the library imports Node.js-only modules that will fail in Vite browser builds. The `getMXEPublicKey` function may have RPC-only dependencies.
   - Recommendation: Early spike in Plan 07-01 or 07-02 -- import the library in a Vite dev build and verify it bundles correctly. If it fails, may need to polyfill or use a browser-compatible subset.

2. **Arcium Devnet DKG Blocker Impact on Frontend Testing**
   - What we know: DKG ceremony is non-functional on devnet (0/142 MXE accounts completed). MPC computations cannot execute on devnet.
   - What's unclear: Whether frontend can be tested end-to-end with real MPC. The bet flow will encrypt data but the MPC callback will never fire on devnet.
   - Recommendation: Build all UI and transaction submission logic against localnet (arcium localnet). For devnet deployment, the encrypt -> submit path works but MPC resolution won't fire until DKG completes. This is a known blocker documented in STATE.md.

3. **Market Account Discovery Method**
   - What we know: `program.account.market.all()` fetches all Market accounts. This is fine for < 100 markets.
   - What's unclear: Whether `all()` performance degrades significantly with many markets, and if we need pagination or a market counter-based iteration.
   - Recommendation: Use `all()` for v1 (< 100 markets expected). Document SCAL-02 (Helius indexer) as the v2 solution for scale.

4. **Wallet Provider Placement and SSR Compatibility**
   - What we know: ConnectionProvider and WalletProvider must wrap the app. TanStack Start does SSR.
   - What's unclear: Whether wrapping the entire `<html>` body in wallet providers causes SSR issues, or if only the body content needs wrapping with ClientOnly.
   - Recommendation: Test with providers inside `<body>` but outside the HTML structure. If SSR fails, wrap providers in ClientOnly with a fallback layout. The key insight: market data fetching does NOT need wallet state (use read-only program), so SSR can still prefetch markets without wallet providers.

## Sources

### Primary (HIGH confidence)
- Anchor TypeScript Client docs: https://www.anchor-lang.com/docs/clients/typescript -- Typed program interaction, IDL types
- Solana Wallet Adapter GitHub (anza-xyz/wallet-adapter): https://github.com/anza-xyz/wallet-adapter -- Wallet Standard, provider setup, auto-detection
- TanStack Query v5 docs: https://tanstack.com/query/latest -- useQuery, useMutation, refetchInterval, SSR
- TanStack Router Query Integration: https://tanstack.com/router/latest/docs/integrations/query -- setupRouterSsrQueryIntegration
- Solana getProgramAccounts: https://solana.com/docs/rpc/http/getprogramaccounts -- Account fetching, filters
- Arcium Encryption docs: https://docs.arcium.com/developers/js-client-library/encryption -- x25519, RescueCipher flow
- Existing test suite (`tests/mpc/client-encryption.ts`, `tests/mpc/helpers.ts`) -- Proven encryption pattern

### Secondary (MEDIUM confidence)
- TanStack Start hydration errors: https://tanstack.com/start/latest/docs/framework/react/guide/hydration-errors -- ClientOnly component
- TanStack Start React Query example: https://tanstack.com/start/latest/docs/framework/react/examples/start-basic-react-query -- Router + Query integration code
- Solana Cookbook Wallet Connect: https://solana.com/developers/cookbook/wallets/connect-wallet-react -- Provider hierarchy
- Sonner toast library: https://sonner.emilkowal.ski/ -- shadcn/ui default toast component
- Vite browser crypto issue: https://github.com/vitejs/vite/issues/13504 -- Module externalization

### Tertiary (LOW confidence)
- @arcium-hq/client browser compatibility -- not explicitly documented for browser use, needs validation spike

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - well-established Solana + React patterns, all libraries verified current
- Architecture: HIGH - existing codebase patterns (TanStack Start, #/ aliases, shadcn/ui) are clear, integration points documented in CONTEXT.md
- Pitfalls: HIGH - SSR hydration and browser crypto issues well-documented in community; MPC lock contention documented in project decisions
- Browser encryption: MEDIUM - @arcium-hq/client proven in Node.js tests, browser compatibility likely but unverified

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days -- stable ecosystem, all libraries at established versions)
