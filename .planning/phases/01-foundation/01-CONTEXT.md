# Phase 1: Foundation - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Solana program skeleton with account model (Market, UserPosition, Config PDAs), USDC vault pattern, Arcium project initialization, and TanStack Start frontend scaffolding. No business logic — just the structural foundation both tracks build on.

</domain>

<decisions>
## Implementation Decisions

### Project Structure
- Arcium project at repo root (`arcium init` creates the structure with `programs/` and `encrypted-ixs/`)
- Frontend lives in `app/` subdirectory within the Arcium project root
- No monorepo/workspace tooling — keep it simple, single repo
- Frontend imports types directly from generated Anchor IDL (no separate shared types package)
- bun as package manager for frontend

### Account Model
- Market question field: 200 characters max (tweet-length, saves on-chain rent)
- Market description: stored off-chain (question on-chain is enough for v1, description can live in indexer/frontend metadata)
- Categories stored as u8 enum on-chain (Politics=0, Crypto=1, Sports=2, Culture=3, Economics=4)
- Config account holds: admin pubkey, fee_recipient, usdc_mint, protocol_fee_bps, market_counter, paused flag
- Market account holds: all fields from ARCHITECTURE.md research (encrypted pools, sentiment, state enum, etc.)
- UserPosition PDA seeded by [market_id, user_pubkey]
- MarketVault PDA-owned SPL token account per market

### Deployment Target
- Localnet first — local Solana validator + Docker for Arcium MPC nodes
- Devnet deployment deferred until Phase 3 (Arcium MPC Core) validates the integration
- Use Anchor's built-in localnet tooling for program testing

### Frontend Shell
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

</decisions>

<specifics>
## Specific Ideas

- Research recommended project structure: `programs/avenir/src/` for Solana program, `encrypted-ixs/` for MPC circuits, `app/` for frontend
- Arcium v0.4.0 requires: Anchor 0.32.1, Solana CLI 2.3.0, Rust 1.89.0+, @solana/web3.js v1.x (NOT v2)
- Docker required for local Arcium testing (`arcium test` spins up local Arx nodes)
- Frontend packages: @solana/web3.js@1, @coral-xyz/anchor@0.32.1, @arcium-hq/client@0.5.2

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, empty repo

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- Anchor IDL generation → frontend type consumption
- Arcium.toml + Anchor.toml configuration at project root
- TanStack Start app.config.ts as frontend entry point

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-02*
