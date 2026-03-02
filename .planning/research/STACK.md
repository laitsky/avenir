# Technology Stack

**Project:** Avenir -- Confidential Prediction Market on Solana with Arcium MPC
**Researched:** 2026-03-02

## Recommended Stack

### On-Chain: Solana Program + Arcium MPC

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Anchor Framework | 0.32.1 | Solana program framework | Arcium's Arcis tooling is built as a wrapper around Anchor CLI -- using Anchor is non-negotiable. v0.32.1 is the version explicitly required by Arcium v0.4.0. | HIGH |
| Arcium CLI (arcup) | 0.8.5 | CLI for building/testing MXE programs | Wraps Anchor CLI with circuit compilation. Install via `curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ \| bash` then `arcup install`. | HIGH |
| Arcis Framework | 0.4.0 | Rust-based MPC circuit authoring | The only way to write confidential instructions for Arcium. Uses `#[encrypted]` module + `#[instruction]` function annotations. Compiles to MPC bytecodes. | HIGH |
| arcium-anchor | 0.4.0 | Rust crate bridging Anchor and Arcium | Provides `#[arcium_program]`, `#[arcium_callback]`, `queue_computation()`, and PDA helpers. Required for any Arcium Solana program. | HIGH |
| arcium-macros | 0.4.0 | Procedural macros for Arcis | Companion crate to arcium-anchor providing derive macros. | HIGH |
| Solana CLI | 2.3.0 | Local validator, key management, deployment | Required version per Arcium installation docs. | HIGH |
| Rust | 1.89.0+ | Program language | Required by Arcium v0.4.0 migration. Use `rust-toolchain.toml` format (not legacy `rust-toolchain` file). | HIGH |
| anchor-lang | 0.32.1 | Rust crate for Anchor programs | Matched to Anchor CLI version. | HIGH |
| anchor-spl | 0.32.1 | SPL Token CPI helpers for Anchor | Needed for USDC token transfers (mint, transfer, burn) within the Solana program. | HIGH |
| spl-token | 6.0.0 | SPL Token program interface | For direct SPL token interactions in Rust program code. | MEDIUM |

### Frontend: TanStack Start + React

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Start | ~1.154.x (RC) | Full-stack React meta-framework | User preference per PROJECT.md. Currently RC but feature-complete with stable API. Built on Vite, supports SSR, streaming, server functions. Has official Tailwind + shadcn integration guides. | HIGH |
| React | 19.x | UI library | TanStack Start v1 ships with React 19 support. Required for shadcn/ui Tailwind v4 compatibility. | HIGH |
| TanStack Router | (bundled with Start) | Type-safe file-based routing | Core of TanStack Start. Type-safe params, loaders, search params. | HIGH |
| TanStack Query | ~5.90.x | Server state management / caching | First-class integration with TanStack Start. Handles on-chain data fetching, caching, and background refetching. | HIGH |
| Vite | (bundled with Start) | Build tool | TanStack Start migrated from Vinxi to Vite in v1.121.0. Powers dev server, bundling, and plugin system. | HIGH |

### Styling & UI Components

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.2.x | Utility-first CSS framework | v4 is production-ready with first-party Vite plugin (`@tailwindcss/vite`). 5x faster full builds. CSS-first config via `@theme` directive -- perfect for the forest/fog custom design system. OKLCH color space for richer greens and golds. | HIGH |
| shadcn/ui | latest | Component primitives (Radix-based) | Official TanStack Start installation guide exists: `pnpm create @tanstack/start@latest --tailwind --add-ons shadcn`. Ships with Tailwind v4 + React 19 support. Not a dependency -- copies components into your codebase for full customization of the forest theme. | HIGH |
| @tailwindcss/vite | 4.2.x | Vite plugin for Tailwind | Required for TanStack Start integration. Replaces PostCSS-based setup. | HIGH |
| Motion (framer-motion) | ~12.34.x | Animation library | For fog gradient animations, card transitions, reveal effects when encrypted data resolves. 120fps GPU-accelerated. 30M+ monthly npm downloads. | MEDIUM |

### Solana Client Libraries (TypeScript)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @solana/web3.js | 1.95.x (v1 line) | Solana RPC client, transaction building | MUST use v1.x, NOT v2.x. Anchor 0.32.1 is NOT compatible with web3.js v2.x. The Arcium TS SDK also depends on Anchor which pins to v1. | HIGH |
| @coral-xyz/anchor (TS) | 0.32.1 | TypeScript Anchor client | Generates typed program clients from IDL. Required by @arcium-hq/client. | HIGH |
| @arcium-hq/client | 0.5.2 | Arcium TypeScript SDK | Core client for encrypted computation: x25519 key exchange, RescueCipher encryption/decryption, PDA address helpers (`getClusterAccAddress`, `getMXEAccAddress`, `getCompDefAccAddress`, etc.), computation finalization awaiting. | HIGH |
| @arcium-hq/reader | latest | Read-only Arcium network observer | For querying computation state, account data, and event monitoring without signing. Useful for market status displays. | MEDIUM |
| @solana/wallet-adapter-react | 0.15.x | React wallet connection hooks | Standard wallet integration for Phantom, Solflare, Backpack. Provides `useWallet()`, `useConnection()`. | HIGH |
| @solana/wallet-adapter-react-ui | 0.9.x | Pre-built wallet UI components | Connect/disconnect button, wallet modal. Customizable to match forest theme. | HIGH |
| @solana/wallet-adapter-wallets | latest | Wallet adapter implementations | Bundles adapters for target wallets (Phantom, Solflare, Backpack). | HIGH |
| @solana/spl-token | 0.4.x | SPL Token JS client | For client-side USDC balance checks, token account lookups, and associated token account creation. | HIGH |

### Client-Side State & Data

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0.x | Client-side state management | Lightweight (2KB), no boilerplate, hook-based. Perfect for wallet state, UI state, market filters. TanStack Query handles server state; Zustand handles ephemeral client state. | HIGH |

### Development & Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker & Docker Compose | latest | Arcium local network | Required for `arcium test` which spins up local Arx nodes for MPC circuit testing. | HIGH |
| TypeScript | 5.x | Type safety across frontend | TanStack Start is TypeScript-first. Type-safe routes, loaders, server functions. | HIGH |
| Biome | 1.x | Linting + formatting | Faster than ESLint + Prettier combined. Single tool. Supports TS/TSX/JSON. | MEDIUM |
| vitest | latest | Unit/integration testing (frontend) | Native Vite integration since TanStack Start is Vite-based. | MEDIUM |
| anchor test (via arcium) | -- | On-chain program testing | `arcium test` wraps Anchor's test runner with local Arcium cluster. Uses Mocha + Chai by default. | HIGH |

### Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Cloudflare Workers/Pages | -- | Frontend hosting | Official TanStack Start deployment target. Edge SSR, streaming support. Free tier generous for RTG submission. | MEDIUM |
| Solana Mainnet-Beta | -- | Program deployment | Production Solana network. | HIGH |
| Arcium Mainnet Alpha | -- | MPC computation network | Arcium's production network is live as of early 2026. | HIGH |
| Helius / QuickNode | -- | Solana RPC provider | Dedicated RPC for reliability. Free tiers available. Helius has deep Solana ecosystem ties. | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | TanStack Start | Next.js 15/16 | User preference for TanStack. Also, Next.js App Router has known complexity with Solana wallet adapter providers and client-side-heavy dApps. TanStack Start gives cleaner client/server boundary control. |
| Frontend framework | TanStack Start | Vite + React SPA | Loses SSR benefits for SEO (market pages), server functions for RPC proxying, and streaming for large market feeds. |
| Styling | Tailwind v4 + shadcn | Chakra UI, MUI | shadcn gives full ownership of component code for deep forest-theme customization. Chakra/MUI impose their design system. Tailwind v4's CSS-first config with OKLCH is ideal for the earthy color palette. |
| State management | Zustand | Redux Toolkit, Jotai | Redux is overkill for this scope. Jotai is atomic (good for complex state graphs) but Zustand's simplicity wins for prediction market UI state (filters, modals, active market). TanStack Query already handles server state. |
| Animation | Motion (framer-motion) | CSS animations, GSAP | Motion's declarative API matches React patterns. CSS-only cannot handle the fog reveal effects and staggered animations needed. GSAP is imperative and heavier. |
| Solana web3 | @solana/web3.js v1 | @solana/web3.js v2 | v2 is NOT compatible with Anchor 0.32.1 or @arcium-hq/client. Forced to v1 by dependency chain. Do NOT install v2 -- it will break everything. |
| Program framework | Anchor 0.32.1 | Native Solana (no framework) | Arcium CLI wraps Anchor -- there is no option to use raw Solana programs. Anchor is a hard requirement. |
| Package manager | bun | npm, yarn, pnpm | User preference per CLAUDE.md. Arcium docs default to yarn but `bun install` works as a drop-in replacement. |

## Critical Compatibility Constraints

### The Anchor-Arcium Version Lock

This is the single most important constraint in the entire stack:

```
Arcium v0.4.0 --> Anchor 0.32.1 --> @solana/web3.js v1.x (NOT v2)
                                  --> Solana CLI 2.3.0
                                  --> Rust 1.89.0+
```

**Every version in this chain is pinned.** Upgrading any one component without upgrading the others WILL break the build. When Arcium releases v0.5.0, check their migration guide before touching any versions.

### TanStack Start RC Status

TanStack Start is in Release Candidate. The API is stable but:
- Lock dependency versions in package.json (no `^` ranges for `@tanstack/*`)
- Follow TanStack releases for bug fixes
- v1.0 stable expected mid-2026

### Tailwind v4 + shadcn/ui

shadcn/ui fully supports Tailwind v4 as of early 2026. New projects start with v4 by default. The `@theme` directive replaces `tailwind.config.ts` -- all customization happens in CSS, which is actually simpler for the forest/fog design system.

## Installation

### Prerequisites

```bash
# Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI 2.3.0
sh -c "$(curl -sSfL https://release.anza.xyz/v2.3.0/install)"

# Anchor 0.32.1 (via avm)
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.32.1
avm use 0.32.1

# Arcium CLI
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
arcup install

# Docker (required for local Arcium testing)
# Install Docker Desktop or Docker Engine per your platform

# Verify
arcium --version
anchor --version
solana --version
```

### Initialize Arcium Project

```bash
arcium init avenir
cd avenir
```

This creates the Anchor project structure with additional `encrypted-ixs/` directory and `Arcium.toml`.

### Frontend (in a separate directory or monorepo)

```bash
# Initialize TanStack Start with Tailwind + shadcn
bunx create @tanstack/start@latest --tailwind --add-ons shadcn

# Core Solana client packages
bun add @solana/web3.js@1 @coral-xyz/anchor@0.32.1 @arcium-hq/client@0.5.2
bun add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
bun add @solana/spl-token

# State & animation
bun add zustand framer-motion

# Optional: Arcium reader for passive observation
bun add @arcium-hq/reader

# Dev dependencies
bun add -D @tailwindcss/vite typescript @types/react @types/react-dom
bun add -D vitest @testing-library/react
```

### Rust Dependencies (programs/avenir/Cargo.toml)

```toml
[dependencies]
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"
arcium-macros = "0.4.0"
arcium-anchor = "0.4.0"

[features]
default = []
idl-build = [
    "anchor-lang/idl-build",
    "anchor-spl/idl-build",
    "arcium-anchor/idl-build",
]
```

### Rust Toolchain (rust-toolchain.toml)

```toml
[toolchain]
channel = "1.89.0"
components = ["rustfmt", "clippy"]
```

**Important:** Use TOML format, not the legacy plain-text `rust-toolchain` file. Arcium v0.4.0 requires this.

## Project Structure (Recommended)

```
avenir/
  programs/
    avenir/
      src/
        lib.rs              # Main Solana program with #[arcium_program]
        state.rs            # Market, bet, dispute account structs
        instructions/       # Anchor instruction handlers
          create_market.rs
          place_bet.rs
          resolve_market.rs
          dispute.rs
        errors.rs           # Custom error codes
      Cargo.toml
  encrypted-ixs/
    add_bet.rs              # MPC circuit: encrypted bet accumulation
    resolve_payout.rs       # MPC circuit: encrypted payout calculation
    tally_votes.rs          # MPC circuit: encrypted dispute vote tally
    sentiment_bucket.rs     # MPC circuit: compute sentiment from pool ratio
  app/                      # TanStack Start frontend
    src/
      routes/
        __root.tsx
        index.tsx           # Market feed
        market.$id.tsx      # Individual market page
      components/
      lib/
        solana/             # Wallet, Arcium client setup
        hooks/              # Custom React hooks
      styles/
        app.css             # Tailwind v4 + forest theme @theme
    app.config.ts
    vite.config.ts
  Arcium.toml
  Anchor.toml
```

## Key Environment Variables

```bash
# Arcium (set automatically by `arcium localnet`, manual for devnet/mainnet)
ARCIUM_CLUSTER_OFFSET=<cluster_offset>

# Solana
ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com  # or devnet
ANCHOR_WALLET=~/.config/solana/id.json

# Frontend
VITE_SOLANA_RPC_URL=<helius_or_quicknode_url>
VITE_SOLANA_NETWORK=mainnet-beta  # or devnet
VITE_PROGRAM_ID=<deployed_program_id>
```

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| @solana/web3.js v2.x | Incompatible with Anchor 0.32.1 and @arcium-hq/client. Will cause runtime errors. |
| Anchor 1.0.0-rc.x | Arcium v0.4.0 explicitly requires 0.32.1. Do not use release candidates. |
| Next.js | Not a technical blocker but user selected TanStack Start. Next's App Router adds SSR complexity for wallet-heavy dApps. |
| Tailwind v3 | v4 is stable, has better Vite integration, and CSS-first config is simpler for custom design systems. |
| Xargo | Removed in Arcium v0.4.0 migration. Delete any Xargo.toml files. |
| proc-macro2 cargo patch | Removed in Arcium v0.4.0 migration. Delete from workspace Cargo.toml. |
| yarn/npm | User preference is bun. All packages compatible with bun. |

## Sources

- [Arcium Developer Docs -- Installation](https://docs.arcium.com/developers/installation) -- HIGH confidence, official docs
- [Arcium Arcis Framework](https://docs.arcium.com/developers/arcis) -- HIGH confidence, official docs
- [Arcium Hello World](https://docs.arcium.com/developers/hello-world) -- HIGH confidence, official docs
- [Arcium v0.3 to v0.4 Migration](https://docs.arcium.com/developers/migration/migration-v0.3-to-v0.4) -- HIGH confidence, version pinning source
- [Arcium TypeScript SDK Quick Start](https://ts.arcium.com/docs) -- HIGH confidence, official SDK docs
- [Arcium TypeScript SDK API Reference](https://ts.arcium.com/api) -- HIGH confidence, official API docs
- [@arcium-hq/client on npm](https://www.npmjs.com/package/@arcium-hq/client) -- HIGH confidence, v0.5.2
- [Arcium Solana Integration](https://docs.arcium.com/solana-integration-and-multichain-coordination) -- HIGH confidence
- [Helius: Arcium Privacy 2.0 for Solana](https://www.helius.dev/blog/solana-privacy) -- MEDIUM confidence, third-party explainer
- [TanStack Start v1 RC Announcement](https://tanstack.com/blog/announcing-tanstack-start-v1) -- HIGH confidence, official
- [TanStack Start Tailwind Integration](https://tanstack.com/start/latest/docs/framework/react/guide/tailwind-integration) -- HIGH confidence, official docs
- [Tailwind CSS TanStack Start Guide](https://tailwindcss.com/docs/installation/framework-guides/tanstack-start) -- HIGH confidence, official docs
- [shadcn/ui TanStack Start Installation](https://ui.shadcn.com/docs/installation/tanstack) -- HIGH confidence, official docs
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) -- HIGH confidence, official docs
- [Anchor 0.32.1 Release](https://github.com/solana-foundation/anchor/releases) -- HIGH confidence, official
- [Anchor TypeScript Docs](https://www.anchor-lang.com/docs/clients/typescript) -- HIGH confidence, confirms v1 web3.js requirement
- [Solana web3.js 2.0 Release](https://www.anza.xyz/blog/solana-web3-js-2-release) -- HIGH confidence, confirms Anchor incompatibility
- [@solana/wallet-adapter-react on npm](https://www.npmjs.com/package/@solana/wallet-adapter-react) -- HIGH confidence
- [Solana Wallet Connection Cookbook](https://solana.com/developers/cookbook/wallets/connect-wallet-react) -- HIGH confidence, official
- [Bun + TanStack Start Guide](https://bun.com/docs/guides/ecosystem/tanstack-start) -- HIGH confidence, official Bun docs
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4) -- HIGH confidence, official
- [Arcium Mainnet Alpha](https://blockeden.xyz/blog/2026/02/12/arcium-mainnet-alpha-encrypted-supercomputer-solana/) -- MEDIUM confidence, third-party
