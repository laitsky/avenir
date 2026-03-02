# Phase 1: Foundation - Research

**Researched:** 2026-03-02
**Domain:** Solana program scaffolding (Anchor/Arcium), TanStack Start frontend, USDC vault custody
**Confidence:** HIGH

## Summary

Phase 1 establishes the structural foundation for Avenir: a Solana program with account PDAs for markets and bets, a USDC vault custody pattern, a TanStack Start frontend shell, and Arcium project initialization. This is a greenfield project — no existing code patterns to integrate with.

The Anchor 0.32.1 + Arcium toolchain is well-documented with clear project scaffolding via `arcium init`. The critical insight is that `arcium init` creates the entire project structure (including `programs/` and `encrypted-ixs/`), so the Solana program scaffold lives *inside* the Arcium project — not the other way around. The frontend scaffold uses TanStack Start with Bun, Tailwind v4 (CSS-first configuration), and shadcn/ui with official TanStack Start support. All three tracks are independent and can be developed in parallel.

**Primary recommendation:** Run `arcium init avenir` at repo root to create the base project structure, then scaffold the frontend in `app/` as a separate TanStack Start project. Use Anchor's `InitSpace` derive macro and PDA token account pattern for all account structs.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Arcium project at repo root (`arcium init` creates the structure with `programs/` and `encrypted-ixs/`)
- Frontend lives in `app/` subdirectory within the Arcium project root
- No monorepo/workspace tooling — keep it simple, single repo
- Frontend imports types directly from generated Anchor IDL (no separate shared types package)
- bun as package manager for frontend
- Market question field: 200 characters max (tweet-length, saves on-chain rent)
- Market description: stored off-chain (question on-chain is enough for v1, description can live in indexer/frontend metadata)
- Categories stored as u8 enum on-chain (Politics=0, Crypto=1, Sports=2, Culture=3, Economics=4)
- Config account holds: admin pubkey, fee_recipient, usdc_mint, protocol_fee_bps, market_counter, paused flag
- Market account holds: all fields from ARCHITECTURE.md research (encrypted pools, sentiment, state enum, etc.)
- UserPosition PDA seeded by [market_id, user_pubkey]
- MarketVault PDA-owned SPL token account per market
- Localnet first — local Solana validator + Docker for Arcium MPC nodes
- Devnet deployment deferred until Phase 3
- Basic layout structure with route shells: homepage, market detail, portfolio
- Header component with placeholder nav and wallet connect slot
- Single placeholder page per route confirming TanStack Start + Tailwind v4 + shadcn/ui work
- File-based routing set up for: `/` (home), `/market/$id` (detail), `/portfolio` (user positions)

### Claude's Discretion
- Exact Anchor account struct field ordering and padding
- rust-toolchain.toml configuration details
- TanStack Start project configuration (vite.config, app.config)
- Tailwind v4 initial @theme setup (design system tokens come in Phase 4)
- Testing setup and initial test structure

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INF-01 | Solana program built with Anchor 0.32.1 + Arcium v0.4.0 | Anchor 0.32.1 installation via AVM, `arcium init` creates integrated project structure with programs/ and encrypted-ixs/, Rust 1.89.0+ required, Solana CLI 2.3.0 |
| INF-05 | Frontend built with TanStack Start, Tailwind v4, shadcn/ui | `bun create @tanstack/start@latest --tailwind --add-ons shadcn`, CSS-first Tailwind v4 config with @theme directive, file-based routing with __root.tsx pattern |
| MKT-04 | Each market has a PDA-owned USDC vault for fund custody | Anchor `token::mint` + `token::authority` constraints on PDA token accounts, Market PDA as vault authority, seeds = [b"vault", market_id] pattern |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Anchor | 0.32.1 | Solana program framework | De facto standard for Solana development; IDL generation, PDA derivation, account constraints |
| Arcium CLI | latest (via arcup) | MPC project scaffolding | Required for encrypted computation; creates integrated Anchor + MPC project structure |
| Solana CLI (Agave) | 2.3.0 | Blockchain tooling | Required by Anchor 0.32; local validator, keypair management, deployment |
| Rust | >= 1.89.0 | Program language | Required by Anchor 0.32 for stable `Span::local_file` in IDL generation |
| TanStack Start | latest | Full-stack React framework | SSR, file-based routing, server functions; official shadcn/ui support |
| Tailwind CSS | v4 | Utility CSS framework | CSS-first configuration, automatic content detection, @theme design tokens |
| shadcn/ui | latest | UI component library | Copy-paste components, native TanStack Start support, Tailwind v4 compatible |
| @solana/web3.js | v1.x (NOT v2) | Solana JS SDK | v2 (@solana/kit) has breaking API changes incompatible with Anchor 0.32.1 client and wallet adapters |
| @coral-xyz/anchor | 0.32.1 | Anchor TS client | Must match program framework version; IDL consumption, transaction building |
| @arcium-hq/client | 0.5.2 | Arcium TS client | x25519 key exchange, RescueCipher encryption, MPC computation submission |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| anchor-spl | 0.32.1 | SPL token integration in Anchor | Token account creation, transfers, mint constraints |
| spl-token | latest | SPL token program types | Token account structs, mint types for Rust program |
| Docker + Docker Compose | latest | Local MPC node testing | `arcium test` spins up local Arx nodes via Docker |
| @tanstack/react-router | (bundled with Start) | Client-side routing | File-based routing, type-safe route params |
| @tailwindcss/postcss | v4 | PostCSS plugin for Tailwind | Required for Vite integration with Tailwind v4 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @solana/web3.js v1 | @solana/kit (v2) | v2 has BigInt-based API, tree-shakeable — but Anchor 0.32.1 client requires v1, wallet adapters untested with v2 |
| TanStack Start | Next.js / Remix | Next.js is more mature but heavier; TanStack Start is lighter, better TanStack ecosystem integration |
| shadcn/ui | Radix UI direct | shadcn/ui wraps Radix with Tailwind styling; direct Radix means more manual styling |
| Tailwind v4 | Tailwind v3 | v3 is more battle-tested; v4 removes JS config, has CSS-first approach which is simpler for new projects |

**Installation (Solana/Anchor toolchain):**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Install Solana CLI 2.3.0
sh -c "$(curl -sSfL https://release.anza.xyz/v2.3.0/install)"

# Install Anchor 0.32.1 via AVM
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.32.1
avm use 0.32.1

# Install Arcium CLI
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
```

**Installation (Frontend):**
```bash
# Create TanStack Start app with Tailwind + shadcn/ui
bun create @tanstack/start@latest --tailwind --add-ons shadcn
```

## Architecture Patterns

### Recommended Project Structure
```
avenir/                          # Repo root (arcium init creates this)
├── Arcium.toml                  # Arcium toolchain configuration
├── Anchor.toml                  # Anchor configuration (localnet, devnet)
├── Cargo.toml                   # Rust workspace
├── rust-toolchain.toml          # Pin Rust version (>= 1.89.0)
├── programs/
│   └── avenir/
│       └── src/
│           ├── lib.rs           # Program entry point, declare_id!
│           ├── state/           # Account structs (Market, UserPosition, Config)
│           │   ├── mod.rs
│           │   ├── config.rs
│           │   ├── market.rs
│           │   └── user_position.rs
│           ├── instructions/    # Instruction handlers
│           │   ├── mod.rs
│           │   └── initialize.rs
│           └── errors.rs        # Custom error codes
├── encrypted-ixs/               # Arcium MPC circuits (Phase 3)
│   └── src/
│       └── lib.rs               # Placeholder encrypted instructions
├── tests/                       # Anchor integration tests
│   └── avenir.ts
├── migrations/                  # Deployment migrations
├── app/                         # TanStack Start frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── src/
│   │   ├── styles/
│   │   │   └── app.css          # @import "tailwindcss" + @theme
│   │   ├── router.tsx           # createRouter with routeTree
│   │   ├── routes/
│   │   │   ├── __root.tsx       # Root layout (Header, Outlet)
│   │   │   ├── index.tsx        # Homepage (/)
│   │   │   ├── market/
│   │   │   │   └── $id.tsx      # Market detail (/market/$id)
│   │   │   └── portfolio.tsx    # Portfolio (/portfolio)
│   │   └── components/
│   │       └── ui/              # shadcn/ui components
│   └── public/
└── target/                      # Rust build output
```

### Pattern 1: PDA Account Model with InitSpace
**What:** Define account structs with `#[derive(InitSpace)]` and use `8 + T::INIT_SPACE` for space calculation. Store bump seeds in the account for CPI signing.
**When to use:** Every account struct in the program.
**Example:**
```rust
// Source: Anchor docs + prediction market patterns
#[account]
#[derive(InitSpace)]
pub struct Market {
    pub id: u64,
    #[max_len(200)]
    pub question: String,
    pub category: u8,                    // Category enum as u8
    pub resolution_time: i64,
    pub state: u8,                       // MarketState enum as u8
    pub winning_outcome: u8,             // Outcome enum as u8
    pub yes_pool_encrypted: [u8; 32],    // Arcium ciphertext
    pub no_pool_encrypted: [u8; 32],     // Arcium ciphertext
    pub sentiment: u8,                   // 0=Unknown, 1=LeaningYes, 2=Even, 3=LeaningNo
    pub total_bets: u64,
    pub creator: Pubkey,
    pub created_at: i64,
    pub config_fee_recipient: Pubkey,    // Snapshot from config at creation
    pub config_fee_bps: u16,             // Snapshot from config at creation
    pub mpc_lock: bool,                  // Sequential MPC lock
    pub bump: u8,
    pub vault_bump: u8,
}
```

### Pattern 2: PDA-Owned USDC Vault
**What:** Create a token account where the Market PDA is both the derivation seed and the authority, enabling the program to sign CPI transfers.
**When to use:** Every market needs a USDC vault.
**Example:**
```rust
// Source: Anchor token docs + escrow pattern
#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        seeds = [b"vault", market_id.to_le_bytes().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = market,       // Market PDA owns the vault
    )]
    pub market_vault: Account<'info, TokenAccount>,

    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ AvenirError::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
```

### Pattern 3: Config PDA Singleton
**What:** A single Config account seeded with `[b"config"]` that stores global protocol parameters. Initialized once by admin.
**When to use:** Protocol-wide settings (admin, fee recipient, USDC mint, fees, paused flag).
**Example:**
```rust
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    pub usdc_mint: Pubkey,
    pub protocol_fee_bps: u16,
    pub market_counter: u64,
    pub paused: bool,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}
```

### Pattern 4: UserPosition PDA
**What:** Per-user, per-market position tracking with composite PDA seeds.
**When to use:** When a user places a bet on a market.
**Example:**
```rust
#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub market_id: u64,
    pub user: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

// PDA derivation: seeds = [b"position", market_id.to_le_bytes(), user.key()]
```

### Pattern 5: TanStack Start File-Based Routing
**What:** Routes defined by file names in `src/routes/` directory. The `__root.tsx` file defines the layout wrapper.
**When to use:** All page routes.
**Example:**
```
src/routes/
├── __root.tsx           → Root layout (wraps all pages)
├── index.tsx            → / (homepage)
├── market/
│   └── $id.tsx          → /market/:id (dynamic param)
└── portfolio.tsx        → /portfolio
```

### Anti-Patterns to Avoid
- **Manual space calculation:** Use `#[derive(InitSpace)]` + `#[max_len(N)]` instead of hand-computing `8 + 32 + 200 + ...`. Manual math drifts when fields change.
- **Associated token accounts for vaults:** Use PDA-owned token accounts (`seeds` + `token::authority`) not associated token accounts. ATAs are for user wallets, not program vaults.
- **tailwind.config.js in v4:** Tailwind v4 uses CSS-first config with `@theme` directive. No JS config file needed.
- **@solana/web3.js v2 with Anchor 0.32:** The v2 SDK (now @solana/kit) uses different types (Address vs PublicKey, BigInt vs number). Anchor 0.32.1 client requires v1.
- **app.config.ts for TanStack Start:** The old Vinxi-based `app.config.ts` is deprecated. Use `vite.config.ts` with `tanstackStart` plugin.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDA derivation | Manual seed hashing | Anchor `seeds` + `bump` constraints | Anchor validates derivation at runtime, prevents PDA spoofing |
| Token account init | Manual CPI to Token program | Anchor `token::mint` + `token::authority` | Handles rent, space, ownership atomically |
| Account space | Manual byte counting | `#[derive(InitSpace)]` | Auto-calculated, stays in sync with struct changes |
| Account serialization | Manual borsh serialize | Anchor `#[account]` derive | Handles discriminator, serialization, deserialization, close |
| Error handling | String messages | Anchor `#[error_code]` enum | Typed errors, client-parseable, consistent format |
| File-based routing | Manual route tree | TanStack Router Vite plugin | Auto-generates `routeTree.gen.ts` with full type safety |
| CSS design tokens | JS config objects | Tailwind v4 `@theme` directive | CSS custom properties, no build step for token changes |
| Component primitives | Custom accessible components | shadcn/ui (wraps Radix) | Accessibility, keyboard nav, ARIA attributes handled |

**Key insight:** Both Anchor and TanStack Start are "convention-over-configuration" frameworks. Fighting their conventions (manual account management, manual route trees) creates maintenance debt with no benefit.

## Common Pitfalls

### Pitfall 1: Rust Version Mismatch
**What goes wrong:** `anchor build` fails with cryptic errors about unstable features or `Span::local_file`.
**Why it happens:** Anchor 0.32 requires Rust >= 1.89.0 for stable IDL generation. System Rust may be older.
**How to avoid:** Pin version in `rust-toolchain.toml` at project root: `[toolchain]\nchannel = "1.89.0"` (or newer, e.g. 1.92.0 as used in recent Arcium examples).
**Warning signs:** Build errors mentioning `proc_macro`, `Span`, or "unstable feature".

### Pitfall 2: @solana/web3.js v2 Incompatibility
**What goes wrong:** TypeScript compilation errors, wallet adapter failures, Anchor client type mismatches.
**Why it happens:** `@solana/web3.js` v2 (now `@solana/kit`) completely rewrites the API: `PublicKey` becomes `Address`, `Keypair` becomes `KeyPairSigner`, amounts use `BigInt`. Anchor 0.32.1's TypeScript client depends on v1 types.
**How to avoid:** Explicitly install `@solana/web3.js@1` in frontend `package.json`. Never install without version constraint.
**Warning signs:** Import errors for `PublicKey`, `Connection`, `Keypair` from `@solana/web3.js`.

### Pitfall 3: Anchor.toml Program ID Mismatch
**What goes wrong:** `anchor build` succeeds but `anchor deploy` or `anchor test` fails with "program ID mismatch".
**Why it happens:** `declare_id!` in `lib.rs` doesn't match the keypair in `target/deploy/avenir-keypair.json` or the ID in `Anchor.toml`.
**How to avoid:** After first `anchor build`, run `anchor keys list` and update both `declare_id!` and `Anchor.toml` with the generated key. Or use `anchor keys sync`.
**Warning signs:** "Deployer program ID does not match" errors.

### Pitfall 4: TanStack Start Vinxi vs Vite Config
**What goes wrong:** Project fails to start, or SSR doesn't work.
**Why it happens:** Older TanStack Start used `app.config.ts` with Vinxi. Current versions use `vite.config.ts` with `tanstackStart` plugin. Stale tutorials reference the old setup.
**How to avoid:** Use `bun create @tanstack/start@latest` which generates the current Vite-based config. If building from scratch, use `vite.config.ts` with `tanstackStart()` plugin.
**Warning signs:** References to `vinxi`, `app.config.ts`, `defineConfig from @tanstack/start/config`.

### Pitfall 5: Tailwind v4 Config Confusion
**What goes wrong:** Custom colors/tokens don't work, old `tailwind.config.js` approaches fail.
**Why it happens:** Tailwind v4 eliminates `tailwind.config.js` entirely. All customization uses `@theme` in CSS. Old tutorials still reference JS config.
**How to avoid:** Use only `@import "tailwindcss"` and `@theme { ... }` in your CSS file. No JS config file.
**Warning signs:** Creating `tailwind.config.js`, using `@tailwind base/components/utilities` directives.

### Pitfall 6: Docker Not Running for Arcium Tests
**What goes wrong:** `arcium test` hangs or fails with connection errors.
**Why it happens:** `arcium test` spins up local Arx MPC nodes via Docker. If Docker daemon isn't running, tests can't start.
**How to avoid:** Ensure Docker Desktop (or `dockerd`) is running before `arcium test`. Verify with `docker ps`.
**Warning signs:** Timeout errors, "Cannot connect to Docker daemon" messages.

### Pitfall 7: PDA Token Account vs Associated Token Account
**What goes wrong:** Vault initialization fails or program can't sign transfers.
**Why it happens:** Using `associated_token::authority` (for user wallets) instead of `token::authority` (for PDA-owned vaults). Associated token accounts use a different derivation.
**How to avoid:** For program-owned vaults, always use `seeds` + `bump` + `token::mint` + `token::authority`. Reserve `associated_token::` for user-owned accounts.
**Warning signs:** "Account not owned by program" errors, CPI authorization failures.

## Code Examples

### Anchor Program Entry Point
```rust
// Source: Anchor 0.32 docs, verified via release notes
use anchor_lang::prelude::*;

declare_id!("YOUR_PROGRAM_ID_HERE");

#[program]
pub mod avenir {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.fee_recipient = params.fee_recipient;
        config.usdc_mint = params.usdc_mint;
        config.protocol_fee_bps = params.protocol_fee_bps;
        config.market_counter = 0;
        config.paused = false;
        config.bump = ctx.bumps.config;
        Ok(())
    }
}
```

### Anchor.toml Configuration
```toml
# Source: Anchor docs
[toolchain]
anchor_version = "0.32.1"

[features]
resolution = true

[programs.localnet]
avenir = "YOUR_PROGRAM_ID_HERE"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "bun run tests/"
```

### rust-toolchain.toml
```toml
# Source: Arcium election example + Anchor 0.32 requirements
[toolchain]
channel = "1.89.0"
```

### Tailwind v4 CSS Entry
```css
/* Source: Tailwind v4 docs */
@import "tailwindcss";

@theme {
  /* Minimal tokens for Phase 1 — full design system comes in Phase 4 */
  --color-background: #0a0a0a;
  --color-foreground: #fafafa;
}
```

### TanStack Start vite.config.ts
```typescript
// Source: TanStack Start docs + Bun guide
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    tailwindcss(),
  ],
});
```

### TanStack Start __root.tsx
```tsx
// Source: TanStack Start routing docs
import { createRootRoute, Outlet, HeadContent, Scripts } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body>
        <header>{/* Placeholder nav + wallet connect slot */}</header>
        <main>
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  );
}
```

### TanStack Start Index Route
```tsx
// Source: TanStack Start file-based routing
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <h1>Avenir</h1>
      <p>Encrypted prediction markets on Solana</p>
    </div>
  );
}
```

### Dynamic Route with Params
```tsx
// Source: TanStack Router docs
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/market/$id")({
  component: MarketDetail,
});

function MarketDetail() {
  const { id } = Route.useParams();
  return (
    <div>
      <h1>Market #{id}</h1>
      <p>Market detail placeholder</p>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js | @theme CSS directive | Tailwind v4 (Jan 2025) | No JS config needed, CSS custom properties exposed at runtime |
| @tailwind base/components/utilities | @import "tailwindcss" | Tailwind v4 (Jan 2025) | Single import, simpler setup |
| app.config.ts (Vinxi) | vite.config.ts (tanstackStart plugin) | TanStack Start migration to Vite | Vinxi deprecated, Vite-native build pipeline |
| app/ source directory | src/ source directory | TanStack Start Vite migration | Source moved from app/ to src/ |
| Docker-based Anchor verification | solana-verify tooling | Anchor 0.32.0 (2025) | Faster verifiable builds, no Docker for verification |
| Nightly Rust for IDL | Stable Rust (>= 1.89.0) for IDL | Anchor 0.32.0 (2025) | No more nightly requirement for builds |
| @solana/web3.js v1 | @solana/kit (v2) available | 2025 | v2 exists but Anchor 0.32 client still requires v1 |

**Deprecated/outdated:**
- `app.config.ts` with Vinxi: Replaced by `vite.config.ts` with `tanstackStart` plugin
- `tailwind.config.js`: Replaced by CSS `@theme` directive in Tailwind v4
- `@tailwind base; @tailwind components; @tailwind utilities;`: Replaced by `@import "tailwindcss"`
- Docker-based Anchor verifiable builds: Replaced by `solana-verify`

## Open Questions

1. **Arcium Version: v0.4.0 vs Latest**
   - What we know: CONTEXT.md specifies Arcium v0.4.0. The arcium-election example uses v0.6.6. The `arcup install` command installs the latest version.
   - What's unclear: Whether v0.4.0 is intentional or outdated information. The Arcium CLI may have breaking changes between versions.
   - Recommendation: Use `arcup install` for latest version unless v0.4.0 is specifically required. Flag this for user confirmation during planning. The `arcup` tool supports version pinning if needed.

2. **TanStack Start Source Directory Convention**
   - What we know: CONTEXT.md says frontend lives in `app/`. Current TanStack Start convention uses `src/` as the source directory inside the project. The old Vinxi convention used `app/`.
   - What's unclear: Whether the user means the TanStack Start project root should be `app/` (containing its own `src/`), or the source directory itself should be `app/`.
   - Recommendation: Interpret as: TanStack Start project root at `avenir/app/` with source code at `avenir/app/src/`. This matches both the user's intent (frontend in `app/` directory) and TanStack Start conventions (source in `src/`).

3. **Anchor IDL Path for Frontend Consumption**
   - What we know: `anchor build` generates IDL to `target/idl/avenir.json` and types to `target/types/avenir.ts`. The frontend needs to import these.
   - What's unclear: Exact import path strategy from `app/` to `target/`. TypeScript path aliases or symlinks may be needed.
   - Recommendation: Configure TypeScript `paths` in `app/tsconfig.json` to alias `@/idl` to `../target/idl/` and `@/types` to `../target/types/`. No build step needed for IDL consumption.

4. **Anchor 0.32 Bun Support**
   - What we know: Anchor 0.32.0 added bun as a package manager option (`anchor init <NAME> --package-manager bun`). Arcium's `arcium init` may or may not pass this flag.
   - What's unclear: Whether `arcium init` respects bun as package manager, or if manual Anchor.toml update is needed.
   - Recommendation: After `arcium init`, check Anchor.toml for package manager setting and update to `bun` if needed. Update test scripts accordingly.

## Sources

### Primary (HIGH confidence)
- [Anchor 0.32.0 Release Notes](https://www.anchor-lang.com/docs/updates/release-notes/0-32-0) - Version requirements, breaking changes, bun support
- [Anchor 0.32.1 Release](https://github.com/solana-foundation/anchor/releases) - Patch for deploy race condition
- [Anchor Token Account Docs](https://www.anchor-lang.com/docs/tokens/basics/create-token-account) - PDA-owned token account pattern
- [Anchor Installation Guide](https://www.anchor-lang.com/docs/installation) - AVM installation, version management
- [Tailwind CSS v4.0 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4) - CSS-first config, @theme, @import
- [shadcn/ui TanStack Start Installation](https://ui.shadcn.com/docs/installation/tanstack) - Official integration guide
- [Arcium Hello World](https://docs.arcium.com/developers/hello-world) - Project structure, arcium init, build/test flow
- [Arcium Installation Guide](https://docs.arcium.com/developers/installation) - arcup, version requirements, Docker dependency
- [Arcium Arcis Framework](https://docs.arcium.com/developers/arcis) - Encrypted instruction model
- [Arcium Encryption Guide](https://docs.arcium.com/developers/js-client-library/encryption) - RescueCipher, x25519 key exchange

### Secondary (MEDIUM confidence)
- [Solana Installation Docs](https://solana.com/docs/intro/installation) - Combined install command, version matrix
- [Helius Anchor Guide](https://www.helius.dev/blog/an-introduction-to-anchor-a-beginners-guide-to-building-solana-programs) - Account constraints, PDA patterns, project structure
- [Prediction Market on Solana (DEV.to)](https://dev.to/sivarampg/building-a-prediction-market-on-solana-with-anchor-complete-rust-smart-contract-guide-3pbo) - Market/UserPosition/Vault account model closely matching Avenir
- [TanStack Start Routing Docs](https://tanstack.com/start/latest/docs/framework/react/guide/routing) - File-based routing setup
- [TanStack Start + Bun Guide](https://bun.com/docs/guides/ecosystem/tanstack-start) - Bun runtime configuration, vite.config.ts
- [Arcium Election Example](https://github.com/quiknode-labs/arcium-election) - Real-world project structure, Anchor 0.32.1 + Arcium integration
- [Arcium Examples Repository](https://github.com/arcium-hq/examples) - Multiple example patterns, difficulty tiers

### Tertiary (LOW confidence)
- [TSS App Starter](https://github.com/ally-ahmed/tss-app) - TanStack Start + shadcn/ui + tRPC reference (uses older Vinxi config, so structure patterns may differ)
- @solana/web3.js v1 vs v2 migration guidance: Community discussion, exact Anchor compatibility untested by researcher

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via official docs, release notes, and real project examples
- Architecture: HIGH - Prediction market account model confirmed from multiple sources including a near-identical Solana prediction market tutorial; TanStack Start patterns verified from official docs
- Pitfalls: HIGH - Version conflicts, config migrations, and PDA patterns are well-documented failure modes
- Arcium specifics: MEDIUM - Version discrepancy (v0.4.0 in CONTEXT vs v0.6.6 in examples) needs user confirmation; CLI behavior verified from docs but MPC circuit patterns not deeply tested

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (30 days — Anchor and TanStack are stable; Arcium is fast-moving, revalidate MPC patterns if needed)
