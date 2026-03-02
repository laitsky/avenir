# Research Summary: Avenir

**Synthesized:** 2026-03-02
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Key Findings

### Stack
Arcium v0.4.0 creates a hard version lock: Anchor 0.32.1, Solana CLI 2.3.0, Rust 1.89.0+, and critically `@solana/web3.js v1.x` (NOT v2). TanStack Start + Tailwind v4 + shadcn/ui has official first-party integration. `@arcium-hq/client v0.5.2` provides x25519 key exchange and RescueCipher encryption. Docker required for local MPC node testing.

### Features — Table Stakes
Binary market trading, market feed homepage, category browsing, wallet connection, USDC betting, portfolio view, market detail page, sentiment display, resolution + payouts, deadline enforcement, market creation, responsive design.

### Features — Differentiators (Arcium-Enabled)
- **Encrypted betting pools** — pool totals hidden, eliminating herding (academically confirmed manipulation vector)
- **Encrypted sentiment buckets** — fuzzy signal without exact numbers
- **Encrypted dispute resolution** — jury votes hidden, preventing UMA-style whale governance attacks
- **Anti-whale stealth** — entire whale-tracking bot ecosystem (PolyIntel, Polylerts) rendered useless
- **Fog-reveal visual metaphor** — no competitor equivalent, strong RTG demo value
- **No oracle dependency** — creator + encrypted dispute avoids UMA/Chainlink single-point-of-failure

### Architecture
Four-layer system: Solana program (state + custody) → Arcium MPC (encrypted compute) → Frontend (encryption + UX) → Indexer (fast reads). **Critical insight: Arcium is stateless.** Encrypted pool state stored on-chain as ciphertext, passed into each MPC computation, updated via callback. Four MPC circuits needed: `update_pool`, `compute_payouts`, `add_dispute_vote`, `finalize_dispute`. Sequential lock for V1 concurrency (reject bets while MPC pending).

### Critical Pitfalls
1. **Both branches execute** in MPC conditionals on secret data — use branchless arithmetic
2. **No dynamic data** — fixed-size `[T; N]` arrays only, process one bet per circuit call
3. **Async concurrency** — sequential lock prevents race conditions on encrypted pool state
4. **Encrypted state relay unvalidated** — must POC the ciphertext store→read→reprocess pattern first
5. **Division expensive** — use multiplication comparisons in circuits, defer division to plaintext
6. **USDC 6 decimals** — all on-chain math in raw token units
7. **Sybil attacks on resolver pool** — minimum pool size, meaningful stakes, random selection

## Build Order Recommendation

| Order | Layer | What | Risk |
|-------|-------|------|------|
| 1 | Foundation | Solana program skeleton + USDC vault (plaintext pools for testing) | LOW |
| 2 | Arcium Core | MPC setup + `update_pool` circuit + encrypted state relay POC | HIGH |
| 3 | Integration | MPC orchestration, `compute_payouts`, concurrency lock | HIGH |
| 4 | Dispute | Resolver pool + encrypted vote circuits + dispute state machine | MEDIUM |
| 5 | Frontend | TanStack Start, wallet, market feed, bet placement, fog UI | LOW |
| 6 | Polish | Indexer, portfolio, search, RTG documentation + demo | LOW |

Frontend can be developed **in parallel** with Layers 2-3 using mock data.

## Open Questions

- **MPC latency on Arcium mainnet/devnet?** Estimated 2-10s but no benchmarks. Determines if sequential lock is viable UX.
- **Can `Enc<Mxe, T>` ciphertext survive Solana account store→read→reprocess cycle?** Core assumption — needs POC validation.
- **Sentiment bucket update frequency?** Every bet vs. every N bets — cost/privacy tradeoff.
- **Resolver pool economics?** Minimum stake amount, slashing %, reward distribution.
- **Arcium compute costs?** No pricing docs found — affects protocol fee viability.
- **TanStack Start + wallet adapter SSR?** Hydration mismatch risk — needs early spike.

## Confidence Matrix

| Area | Confidence | Notes |
|------|-----------|-------|
| Stack versions + compatibility | HIGH | Verified against official Arcium/npm docs |
| Feature landscape + competitor analysis | HIGH | Multi-source, academically backed |
| Account model + data flow | MEDIUM | Standard Solana patterns, Arcium-specific integration unvalidated |
| MPC circuit design | LOW | Pseudocode based on Arcis docs, needs compilation validation |
| Concurrency model | LOW | No reference architecture exists |
| MPC latency estimates | LOW | No Arcium-specific benchmarks found |

## Implications for Roadmap

1. **Phase 1 must validate Arcium integration** — hello-world MPC circuit + encrypted state relay POC before any feature work
2. **On-chain program (plaintext) can start immediately** — account model and USDC patterns are standard Solana
3. **Frontend can develop in parallel** with mock data — fog design system, market feed, bet UX
4. **Dispute system reuses MPC patterns** from betting — build after betting is proven
5. **RTG submission needs strong documentation** — README, architecture diagram, demo video showing fog reveal
6. **Comprehensive depth justified** — Arcium integration risk warrants thorough planning per phase

---
*Synthesized: 2026-03-02*
