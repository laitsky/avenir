# Roadmap: Avenir

## Overview

Avenir delivers a confidential prediction market on Solana powered by Arcium MPC. The roadmap uses **parallel tracks** — on-chain program development and frontend design run simultaneously after Phase 1, converging in Phase 7 when the UI connects to live on-chain data. The highest-risk work (Arcium encrypted state relay POC) is tackled in Phase 3 to validate the core technical assumption before features build on top of it.

## Parallel Execution Strategy

```
Phase 1: Foundation (both tracks)
    ├── ON-CHAIN TRACK ──────────────────────────────────────
    │   ├── Phase 2: Market Creation ──┐
    │   ├── Phase 3: Arcium MPC Core ──┤ (parallel)
    │   │                              ▼
    │   ├── Phase 5: Encrypted Betting
    │   ├── Phase 6: Resolution & Payouts
    │   │                              │
    │   │                              ▼
    │   └── Phase 8: Dispute System ───┤ (parallel with 9)
    │                                  │
    ├── FRONTEND TRACK ────────────────┤
    │   ├── Phase 4: Design System ────┤ (parallel with 2, 3)
    │   │                              ▼
    │   ├── Phase 7: Core UI Integration (CONVERGENCE)
    │   └── Phase 9: Portfolio & Search ┤ (parallel with 8)
    │                                   │
    └── Phase 10: RTG Submission ◄──────┘
```

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Solana program skeleton, account model, USDC vault, and frontend scaffolding
- [x] **Phase 2: Market Creation** - Whitelisted creators can create binary markets with categories and deadline enforcement
- [x] **Phase 3: Arcium MPC Core** - Encrypted state relay POC, update_pool circuit, client-side encryption (completed 2026-03-03)
- [ ] **Phase 4: Design System & Fog** - Forest/fog design tokens, fog gradient primitives, layout shells with mock data
- [ ] **Phase 5: Encrypted Betting** - Users place bets into encrypted pools with sentiment buckets and sequential lock
- [ ] **Phase 6: Resolution & Payouts** - Creator resolves markets, winners receive proportional USDC payouts
- [ ] **Phase 7: Core UI Integration** - Connect frontend to on-chain: market feed, market detail, bet placement, wallet
- [ ] **Phase 8: Dispute System** - Resolver pool, encrypted jury voting, community-triggered dispute escalation
- [ ] **Phase 9: Portfolio & Search** - Portfolio view, full-text search, responsive design
- [ ] **Phase 10: RTG Submission** - Open-source repo, documentation, architecture diagram

## Phase Details

### Phase 1: Foundation
**Goal**: A deployable Solana program with account structures for markets and bets, USDC vault custody, and a running TanStack Start frontend shell
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-05, MKT-04
**Success Criteria** (what must be TRUE):
  1. Solana program compiles and deploys to localnet with Anchor 0.32.1
  2. Market account PDA and bet account PDA can be created on-chain
  3. USDC vault PDA holds deposited tokens and program has authority over it
  4. TanStack Start app runs locally with Tailwind v4 and shadcn/ui rendering a placeholder page
  5. Arcium CLI installed and `arcium init` project structure validated

Plans:
- [x] 01-01: Solana program scaffold with Anchor 0.32.1, account model, and USDC vault
- [x] 01-02: TanStack Start frontend scaffold with Tailwind v4 and shadcn/ui
- [x] 01-03: Arcium project initialization and toolchain validation

### Phase 2: Market Creation
**Goal**: Whitelisted addresses can create binary markets that enforce deadlines and organize by category
**Depends on**: Phase 1
**Parallel with**: Phase 3, Phase 4
**Requirements**: MKT-01, MKT-02, MKT-03
**Success Criteria** (what must be TRUE):
  1. Whitelisted address can create a market with question, outcomes, deadline, category, and resolution source
  2. Non-whitelisted address is rejected when attempting to create a market
  3. Markets are tagged with a category (Politics, Crypto, Sports, Culture, Economics)
  4. Transactions submitted after market deadline are rejected by the program

Plans:
- [x] 02-01: CreatorWhitelist PDA, add/remove creator, create_market with vault init and all validations
- [x] 02-02: cancel_market instruction and comprehensive integration tests

### Phase 3: Arcium MPC Core
**Goal**: The encrypted state relay pattern is validated — ciphertext stored on-chain can be passed into an MPC computation and updated via callback — and users can encrypt data client-side
**Depends on**: Phase 1
**Parallel with**: Phase 2, Phase 4
**Risk**: HIGHEST — this validates the core technical assumption. If this fails, the architecture must be redesigned.
**Requirements**: INF-02, INF-03, INF-07
**Success Criteria** (what must be TRUE):
  1. update_pool MPC circuit compiles with Arcis and executes on a local Arcium node
  2. Encrypted ciphertext written to a Solana account survives the store-read-reprocess cycle through MPC
  3. MPC callback successfully writes updated ciphertext back to the on-chain account
  4. Client-side encryption via @arcium-hq/client produces ciphertext that the MPC circuit can consume
  5. MPC latency benchmarked on devnet (establishes whether sequential lock is viable UX)

**Plans:** 8/8 plans complete

Plans:
- [x] 03-01: Docker install, Arcium Rust deps, hello-world circuit lifecycle (Wave 1)
- [x] 03-02a: MarketPool PDA, update_pool circuit with sentiment (Wave 2)
- [x] 03-02b: MPC callback, init_pool, update_pool instructions (Wave 2)
- [x] 03-03: Encrypted state relay integration test, reusable MPC test helpers (Wave 3)
- [x] 03-04: Client-side encryption via @arcium-hq/client end-to-end validation (Wave 4)
- [x] 03-05: Devnet benchmark config and BENCHMARK.md with placeholder latency (Wave 5)
- [x] 03-06: GitHub Actions CI for arcium build verification (Wave 6)
- [x] 03-07: Devnet deployment and benchmark execution -- DKG blocker documented (Wave 7)

### Phase 4: Design System & Fog
**Goal**: The forest/fog design system is built with reusable tokens, components, and fog gradient primitives — all using mock data so it doesn't depend on on-chain work
**Depends on**: Phase 1 (frontend scaffold only)
**Parallel with**: Phase 2, Phase 3
**Requirements**: INF-06, UX-06, UX-07
**Success Criteria** (what must be TRUE):
  1. Design tokens defined: deep forest green, sage/moss, muted gold/copper, warm dark background in Tailwind v4 @theme
  2. Fog gradient component renders over mock encrypted data with configurable density
  3. Fog-clear animation plays smoothly when triggered (simulating resolution reveal)
  4. Market card, market detail, and bet placement components rendered with mock data
  5. Layout shells for homepage feed, detail page, and portfolio page established

Plans:
- [ ] 04-01: Design tokens (forest/fog oklch palette) and FogOverlay component with reveal animation (Wave 1)
- [ ] 04-02: Mock market data, CountdownTimer, and MarketCard with fog overlays (Wave 2)
- [ ] 04-03: Market detail page with sidebar layout and bet placement form (Wave 2)
- [ ] 04-04: Homepage feed with category tabs, responsive grid, sorting, and portfolio shell (Wave 3)

### Phase 5: Encrypted Betting
**Goal**: Users can place USDC bets on binary markets with their amounts encrypted, pool totals hidden, and a fuzzy sentiment bucket visible
**Depends on**: Phase 2, Phase 3
**Requirements**: BET-01, BET-02, BET-03, BET-04, BET-05, BET-06, BET-07, INF-04
**Success Criteria** (what must be TRUE):
  1. User can place a Yes or No bet with USDC (minimum $1) and the amount is encrypted via MPC before being added to the pool
  2. Pool totals (yes_pool, no_pool) are never visible as plaintext during the market lifecycle
  3. Sentiment bucket (Leaning Yes / Even / Leaning No) is computed inside MPC using multiplication-based comparison and displayed on the market
  4. User's position is locked — no withdrawal or modification after bet placement
  5. Sequential lock prevents concurrent bets from causing race conditions on encrypted pool state

Plans:
- [ ] 05-01: place_bet instruction with USDC transfer and MPC queue orchestration
- [ ] 05-02: update_pool callback handler and encrypted state persistence
- [ ] 05-03: Sentiment bucket computation and on-chain storage
- [ ] 05-04: Sequential lock (computation_pending flag) and bet rejection
- [ ] 05-05: Position locking and bet validation (minimum amount, deadline check)

### Phase 6: Resolution & Payouts
**Goal**: Market creators can declare winners and winning bettors receive instant proportional USDC payouts with protocol fee deducted
**Depends on**: Phase 5
**Requirements**: RES-01, RES-02, RES-07, RES-08, RES-09
**Success Criteria** (what must be TRUE):
  1. Market creator can resolve the market by declaring the winning outcome within the 48-hour grace period
  2. Pool totals are decrypted at resolution via compute_payouts MPC circuit
  3. Winners receive USDC proportional to their share of the winning pool
  4. Protocol fee of 1-2% is deducted from winning payouts before distribution
  5. Losers cannot claim any payout; winners can claim immediately after resolution

Plans:
- [ ] 06-01: resolve_market instruction with creator validation and grace period enforcement
- [ ] 06-02: compute_payouts MPC circuit (reveal pool totals at resolution)
- [ ] 06-03: claim_payout instruction with proportional USDC distribution and protocol fee
- [ ] 06-04: Edge cases: all bets on one side, single bet market, dust handling

### Phase 7: Core UI Integration
**Goal**: The frontend connects to live on-chain data — users can browse real markets, place real bets through the fog-themed UI, and see live sentiment updates
**Depends on**: Phase 4 (design system), Phase 5 (encrypted betting), Phase 6 (resolution)
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Homepage displays live market feed with real on-chain data, category tabs, and sorting
  2. Market detail page shows live question, countdown, fog-wrapped sentiment from MPC, and functional bet placement
  3. User can connect Phantom, Solflare, or Backpack wallet from any page
  4. Bet placement submits real USDC transaction with client-side Arcium encryption
  5. Sentiment bucket updates in UI after MPC callback completes

Plans:
- [ ] 07-01: Solana wallet adapter integration (Phantom, Solflare, Backpack)
- [ ] 07-02: On-chain data fetching with TanStack Query (markets, positions, sentiment)
- [ ] 07-03: Market feed page wired to live data with category filtering and sorting
- [ ] 07-04: Market detail page wired to live data with functional bet placement
- [ ] 07-05: Bet transaction flow (encrypt → submit → await callback → update UI)
- [ ] 07-06: Resolution and claim UI flow

### Phase 8: Dispute System
**Goal**: Community members can escalate unresolved or contested markets to an encrypted jury that determines the outcome via stake-weighted voting
**Depends on**: Phase 6
**Parallel with**: Phase 9
**Requirements**: RES-03, RES-04, RES-05, RES-06
**Success Criteria** (what must be TRUE):
  1. After the 48-hour grace period expires without resolution, any market participant can trigger dispute escalation
  2. Resolver pool members who have staked USDC are eligible to be selected as jurors
  3. Juror votes are encrypted via MPC — no juror can see any other juror's vote
  4. Dispute outcome is determined by stake-weighted encrypted vote tally and the market resolves accordingly
  5. Dispute UI shows fog-wrapped vote status, fog clears when outcome revealed

Plans:
- [ ] 08-01: Resolver pool registration and USDC staking instructions
- [ ] 08-02: Dispute escalation trigger and dispute state machine
- [ ] 08-03: add_dispute_vote MPC circuit (encrypted vote accumulation)
- [ ] 08-04: finalize_dispute MPC circuit (reveal vote outcome)
- [ ] 08-05: Dispute resolution, payout redirection, and resolver reward/slash
- [ ] 08-06: Dispute UI integration (escalation, voting, fog-reveal outcome)

### Phase 9: Portfolio & Search
**Goal**: Users can track their positions, search for markets, and use the app comfortably on mobile browsers
**Depends on**: Phase 7
**Parallel with**: Phase 8
**Requirements**: UX-04, UX-05, UX-08
**Success Criteria** (what must be TRUE):
  1. Portfolio view shows user's active positions, potential payouts, and resolved bet history
  2. Full-text search returns matching markets by question, description, or category
  3. All pages render correctly and are usable on mobile browser viewports

Plans:
- [ ] 09-01: Portfolio view with active positions and potential payouts
- [ ] 09-02: Resolved bet history and claim status
- [ ] 09-03: Full-text search across markets
- [ ] 09-04: Responsive design audit and mobile polish

### Phase 10: RTG Submission
**Goal**: The project is open-source with clear documentation that explains what is encrypted, why it matters, and how Arcium enables it — ready for RTG judges
**Depends on**: Phase 8, Phase 9
**Requirements**: RTG-01, RTG-02, RTG-03
**Success Criteria** (what must be TRUE):
  1. Public GitHub repository with MIT or Apache-2.0 license and clean commit history
  2. README explains what data is encrypted (pools, votes), why it matters (anti-herding, anti-manipulation), and how Arcium MPC enables it
  3. Architecture diagram clearly shows encrypted vs. plaintext data flow across Solana program, Arcium MPC, and frontend layers
  4. Demo video or screenshots showing fog-reveal UX in action

Plans:
- [ ] 10-01: Repository cleanup, licensing, and open-source preparation
- [ ] 10-02: README with Arcium integration explanation and architecture diagram
- [ ] 10-03: Demo preparation (screenshots, optional video walkthrough)

## Progress

**Execution Order:**
Phases 2, 3, 4 execute in parallel after Phase 1. Phase 5 requires 2+3. Phase 7 converges both tracks. Phases 8 and 9 run in parallel. Phase 10 is final.

```
1 → [2, 3, 4] → 5 → 6 → 7 → [8, 9] → 10
```

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-02 |
| 2. Market Creation | 2/2 | Complete | 2026-03-03 |
| 3. Arcium MPC Core | 8/8 | Complete   | 2026-03-03 |
| 4. Design System & Fog | 0/4 | Not started | - |
| 5. Encrypted Betting | 0/5 | Not started | - |
| 6. Resolution & Payouts | 0/4 | Not started | - |
| 7. Core UI Integration | 0/6 | Not started | - |
| 8. Dispute System | 0/6 | Not started | - |
| 9. Portfolio & Search | 0/4 | Not started | - |
| 10. RTG Submission | 0/3 | Not started | - |
