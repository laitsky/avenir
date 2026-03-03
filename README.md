# Avenir

A privacy-preserving prediction market protocol built on Solana with [Arcium](https://arcium.com) MPC (Multi-Party Computation) for encrypted bet processing.

## Overview

Avenir lets users create and participate in binary outcome prediction markets (Yes/No) where individual bet amounts and pool totals are encrypted using Arcium's MPC network. Only an aggregate sentiment signal (Leaning Yes / Even / Leaning No) is revealed publicly -- individual positions and exact pool sizes remain private until market resolution.

### Key Features

- **Encrypted Betting** -- Bet amounts are encrypted client-side and processed through Arcium MPC circuits, so no one (including validators) can see individual wagers.
- **Sentiment Buckets** -- After each bet, an MPC computation reveals only a coarse sentiment indicator (Leaning Yes / Even / Leaning No) without exposing exact pool ratios.
- **USDC Settlement** -- All bets are denominated in USDC with protocol fees configurable in basis points.
- **Creator Whitelist** -- Admin-managed whitelist controls who can create markets.
- **Sequential MPC Lock** -- Prevents concurrent bet processing on the same market to ensure pool state consistency.

## Architecture

```
avenir/
├── programs/avenir/       # Anchor program (Solana smart contract)
│   └── src/
│       ├── lib.rs             # Program entrypoint & MPC callbacks
│       ├── instructions/      # initialize, create_market, cancel_market, add/remove_creator, mpc/*
│       ├── state/             # Config, Market, MarketPool, UserPosition, CreatorWhitelist
│       └── errors.rs
├── encrypted-ixs/         # Arcium MPC circuits (arcis)
│   └── src/lib.rs             # init_pool, update_pool, hello_world circuits
├── app/                   # Frontend (React + TanStack Start + Vite)
│   └── src/
├── tests/
│   ├── avenir.ts              # Anchor integration tests
│   └── mpc/                   # MPC-specific tests (hello_world, update_pool, client-encryption, benchmark)
└── migrations/            # Anchor migration scripts
```

### On-Chain Accounts

| Account | Seeds | Description |
|---------|-------|-------------|
| `Config` | `["config"]` | Protocol settings: admin, fee recipient, USDC mint, fee bps, market counter |
| `Market` | `["market", market_id]` | Market state: question, category, resolution time, sentiment, MPC lock |
| `MarketPool` | `["market_pool", market_id]` | Encrypted pool totals (yes/no ciphertexts + nonce) |
| `UserPosition` | `["position", market_id, user]` | Per-user bet tracking: yes/no amounts, claimed status |
| `CreatorWhitelist` | `["whitelist", creator]` | Whitelist entry for market creators |
| Vault (token account) | `["vault", market_id]` | USDC token vault for each market |

### MPC Circuits

Defined in `encrypted-ixs/src/lib.rs` using the Arcium `arcis` SDK:

- **`init_pool`** -- Initializes encrypted pool counters with zeros for a new market.
- **`update_pool`** -- Accepts an encrypted bet input, updates pool totals, and returns a plaintext sentiment bucket (1=Leaning Yes, 2=Even, 3=Leaning No).
- **`hello_world`** -- Test circuit that adds two encrypted u64 values (used for environment validation).

## Prerequisites

- [Rust](https://rustup.rs/) (toolchain `1.93.0`, managed via `rust-toolchain.toml`)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) `0.32.1`
- [Arcium CLI](https://docs.arcium.com/) (for MPC circuit compilation and localnet)
- [Bun](https://bun.sh/) (for running tests and the frontend)
- [Node.js](https://nodejs.org/) (v18+)

## Getting Started

### Install Dependencies

```bash
bun install
```

### Build the Program

```bash
anchor build
```

### Run Localnet

Start a local Solana validator with Arcium MPC nodes:

```bash
arcium localnet
```

The localnet is configured in `Arcium.toml` with 2 MPC nodes and a 300-second startup timeout.

### Run Tests

Anchor integration tests:

```bash
anchor test
```

This runs `ts-mocha` against all test files in `tests/`.

### Frontend Development

```bash
cd app
bun install
bun run dev
```

The app starts on `http://localhost:3000`.

## Program ID

```
PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN
```

## License

ISC
