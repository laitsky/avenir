# Avenir

## What This Is

Avenir is a confidential prediction market on Solana powered by Arcium's Multi-Party Computation (MPC). Users bet on real-world outcomes (politics, crypto, sports, anything) with their positions fully encrypted — pool totals, individual stakes, and dispute votes remain hidden until resolution. This prevents the herding and manipulation that plague transparent prediction markets like Polymarket. Built for submission to Arcium's RTG (Retroactive Token Grant) program.

## Core Value

Encrypted betting pools that prevent herding — users bet their genuine belief without seeing which side is winning, producing more honest aggregate predictions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Confidential parimutuel binary markets (Yes/No) with encrypted pool totals via Arcium MPC
- [ ] Market creation by whitelisted addresses with question, outcomes, deadline, categories, and resolution source
- [ ] USDC-only betting with $1 minimum, no maximum, positions locked until resolution
- [ ] Encrypted sentiment buckets (Leaning Yes / Even / Leaning No) visible during live markets
- [ ] Creator-based resolution with 48h grace period after deadline
- [ ] Encrypted dispute resolution via dedicated resolver pool using Arcium MPC
- [ ] Community-triggered dispute escalation after grace period expires
- [ ] Instant winner payouts after resolution with 1-2% protocol fee
- [ ] Standard Solana wallet connection (Phantom, Solflare, Backpack)
- [ ] Market feed homepage with category browsing and filtering
- [ ] Forest/fog design system — deep forest green, sage, muted gold accents, fog gradients over encrypted data
- [ ] Improved Polymarket/Kalshi UX layout following prediction market best practices

### Out of Scope

- Secondary market / early exit — parimutuel model doesn't cleanly support pre-resolution trading, revisit in v2
- Email/social login — standard wallet connect only for v1
- AMM or order book mechanics — parimutuel is simpler and better showcases Arcium's value
- Mobile app — web-first
- Governance token — not needed for v1, resolver pool stakes USDC
- Multi-outcome markets — binary (Yes/No) only for v1
- Oracle-based auto-resolution — creator + dispute model covers general-purpose markets

## Context

**Arcium RTG submission.** The RTG program rewards developers who build with Arcium's encrypted computation. Submissions are judged on Innovation, Technical Implementation, User Experience, Impact, and Clarity. Best submissions are announced monthly — no hard deadline.

**Arcium tech stack:** Arcis (Rust-based MPC circuit framework) compiles to fixed circuits for confidential execution on Arcium's node network. TypeScript SDK for client-side integration. Programs deploy as Solana programs that orchestrate encrypted computation via Arcium clusters.

**Key Arcium constraints:**
- MPC circuits have fixed iteration counts and fixed-size data (no Vec/String)
- Both branches execute in conditionals on secret data — cost = sum of branches
- Comparisons are expensive (bit decomposition), division/modulo very expensive
- Supported types: `Enc<Shared, T>` (client + MXE decryptable), `Enc<Mxe, T>` (MXE-only)

**Two Arcium showcases:**
1. Encrypted betting — pool totals hidden, only sentiment buckets revealed during live markets
2. Encrypted dispute resolution — jury votes hidden, only aggregate outcome revealed

**Design direction:** Earthy, sophisticated, "old money tech" aesthetic. Deep forest green primary, sage/moss secondary, muted gold/copper accents, warm dark background (not pure black). "Fog" gradients represent encrypted/private data — fog clears when data is revealed (resolution, dispute outcome). Fog appears on pool amounts, sentiment buckets, jury votes, and live market cards.

## Constraints

- **Tech stack**: Solana + Arcium (Arcis MPC framework) + TanStack Start + bun
- **Betting token**: USDC only — no price volatility on bets
- **Market model**: Parimutuel binary — simplest model that maximizes Arcium's privacy showcase
- **Creators**: Whitelisted — prevents spam markets, curated quality
- **MPC limitations**: Fixed-size data, expensive comparisons/division — circuit design must be optimized

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Parimutuel over AMM/order book | Simpler MPC circuits, hidden pool ratio directly solves herding, clean UX | — Pending |
| Creator resolution + encrypted dispute | Covers general-purpose markets without oracle dependency, double Arcium showcase | — Pending |
| Dedicated resolver pool over random jury | Opt-in motivated participants, USDC stakes (no new token), clear role separation | — Pending |
| Sentiment buckets over total blackout | Users get signal without exact numbers — balances privacy with engagement | — Pending |
| Locked positions (no early exit) | Parimutuel depends on final pool ratio, MPC share transfer too complex for v1 | — Pending |
| Fog gradients for encrypted data | Visual metaphor for privacy — "data under the canopy" — maps to product concept | — Pending |
| TanStack Start over Next.js | User preference — full-stack React with file routing and strong TypeScript | — Pending |

---
*Last updated: 2026-03-02 after initialization*
