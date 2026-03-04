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
- [x] **Phase 4: Design System & Fog** - Forest/fog design tokens, fog gradient primitives, layout shells with mock data
- [x] **Phase 5: Encrypted Betting** - Users place bets into encrypted pools with sentiment buckets and sequential lock
- [x] **Phase 6: Resolution & Payouts** - Creator resolves markets, winners receive proportional USDC payouts (completed 2026-03-04)
- [x] **Phase 7: Core UI Integration** - Connect frontend to on-chain: market feed, market detail, bet placement, wallet (completed 2026-03-04)
- [x] **Phase 8: Dispute System** - Resolver pool, encrypted jury voting, community-triggered dispute escalation (completed 2026-03-04)
- [ ] **Phase 9: Portfolio & Search** - Portfolio view, full-text search, responsive design
- [ ] **Phase 10: RTG Submission** - Open-source repo, documentation, architecture diagram
- [x] **Phase 11: Wire Dispute Frontend Hooks** - useOpenDispute, useFinalizeDispute, init_dispute_tally trigger (Gap Closure) (completed 2026-03-04)
- [ ] **Phase 12: Pool Init & Encryption Hardening** - init_pool trigger, nonce reuse fix (Gap Closure)

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
- [x] 04-01: Design tokens (forest/fog oklch palette) and FogOverlay component with reveal animation (Wave 1)
- [x] 04-02: Mock market data, CountdownTimer, and MarketCard with fog overlays (Wave 2)
- [x] 04-03: Market detail page with sidebar layout and bet placement form (Wave 2)
- [x] 04-04: Homepage feed with category tabs, responsive grid, sorting, and portfolio shell (Wave 3)

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
- [x] 05-01: Market struct extensions, error variants, place_bet instruction with USDC transfer + validation + lock timeout + MPC queue (Wave 1)
- [x] 05-02: update_pool_callback refactor with UserPosition update (success) and USDC refund (failure) (Wave 2)
- [x] 05-03: Integration tests for place_bet happy path, validation errors, lock behavior (Wave 3)
- [x] 05-04: Gap closure -- UserPosition field init, update_pool callback vector fix, test assertions (Wave 1)

### Phase 6: Resolution & Payouts
**Goal**: Market creators can declare winners and winning bettors receive instant proportional USDC payouts with protocol fee deducted
**Depends on**: Phase 5
**Requirements**: RES-01, RES-07, RES-08, RES-09
**Success Criteria** (what must be TRUE):
  1. Market creator can resolve the market by declaring the winning outcome after the deadline passes
  2. Pool totals are decrypted at resolution via compute_payouts MPC circuit
  3. Winners receive USDC proportional to their share of the winning pool
  4. Protocol fee of 1-2% is deducted from winning payouts before distribution
  5. Losers cannot claim any payout; winners can claim immediately after resolution

**Plans:** 5/5 plans complete

Plans:
- [x] 06-01: resolve_market instruction, Market struct extensions, error variants, compute_payouts circuit (Wave 1)
- [x] 06-02: compute_payouts MPC infrastructure -- comp_def, queue, callback (Wave 2)
- [x] 06-03: claim_payout instruction with proportional USDC distribution and protocol fee (Wave 3)
- [x] 06-04: Integration tests for resolution, MPC reveal, payout, and edge cases (Wave 4)
- [x] 06-05: Gap closure -- RES-02 reclassification from Phase 6 to Phase 8 (Wave 1)

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

**Plans:** 3/3 plans complete

Plans:
- [x] 07-01: Wallet adapter, Anchor program setup, PDA helpers, types, encryption wrapper (Wave 1)
- [x] 07-02: Homepage market feed wired to live on-chain data with category tabs and sorting (Wave 2)
- [x] 07-03: Market detail page with live data, bet transaction flow, resolution/claim UI (Wave 2)

### Phase 8: Dispute System
**Goal**: Community members can escalate unresolved or contested markets to an encrypted jury that determines the outcome via stake-weighted voting
**Depends on**: Phase 6
**Parallel with**: Phase 9
**Requirements**: RES-02, RES-03, RES-04, RES-05, RES-06
**Success Criteria** (what must be TRUE):
  1. After the 48-hour grace period expires without resolution, any market participant can trigger dispute escalation
  2. Resolver pool members who have staked USDC are eligible to be selected as jurors
  3. Juror votes are encrypted via MPC — no juror can see any other juror's vote
  4. Dispute outcome is determined by stake-weighted encrypted vote tally and the market resolves accordingly
  5. Dispute UI shows fog-wrapped vote status, fog clears when outcome revealed

**Plans:** 6 plans in 5 waves

Plans:
- [x] 08-01: Resolver pool staking subsystem and 48h grace period enforcement (Wave 1)
- [x] 08-02: Dispute escalation trigger, state machine, and juror selection (Wave 2)
- [x] 08-03: Encrypted voting circuits and cast_vote instruction (Wave 3)
- [x] 08-04: finalize_dispute circuit, tie-breaking, and resolver rewards (Wave 4)
- [x] 08-05: Integration tests for full dispute lifecycle (Wave 5)
- [x] 08-06: Dispute UI integration -- badges, voting panel, fog-reveal (Wave 5)

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

### Phase 11: Wire Dispute Frontend Hooks
**Goal**: Complete the dispute E2E flows by adding missing frontend hooks that call on-chain dispute instructions
**Depends on**: Phase 8
**Gap Closure**: Closes INT-01, INT-02, INT-06 from v1.0 audit; fixes broken Dispute Escalation and Dispute Finalization flows
**Requirements**: RES-03, RES-05, RES-06
**Success Criteria** (what must be TRUE):
  1. useOpenDispute hook submits open_dispute transaction with correct resolver remaining_accounts
  2. useFinalizeDispute hook submits finalize_dispute transaction to queue MPC tally reveal
  3. init_dispute_tally is auto-triggered after successful open_dispute (or as part of the same flow)
  4. DisputeEscalateMode.handleEscalate calls useOpenDispute and escalation completes E2E
  5. DisputeFinalizedMode triggers via useFinalizeDispute and fog clears on tally reveal

Plans:
- [ ] 11-01: IDL regeneration, useOpenDispute hook with init_dispute_tally auto-chain, DisputeEscalateMode wiring (Wave 1)
- [ ] 11-02: useFinalizeDispute + useAddTiebreaker hooks, DisputeFinalizedMode + DisputePendingMode wiring (Wave 2)

### Phase 12: Pool Init & Encryption Hardening
**Goal**: Ensure new markets have MPC-initialized pools before first bet and fix nonce reuse in client-side encryption
**Depends on**: Phase 5
**Gap Closure**: Closes INT-03, INT-05 from v1.0 audit
**Requirements**: BET-01, BET-02, INF-07
**Success Criteria** (what must be TRUE):
  1. init_pool MPC is triggered automatically after create_market (or admin action ensures it runs before first bet)
  2. New markets accept their first bet without MPC failure due to uninitialized pool
  3. Each encrypt call in encryption.ts uses a unique nonce (no nonce reuse between isYes and amount)

**Plans:** 1/2 plans executed

Plans:
- [ ] 12-01: useCreateMarket hook (create_market + init_pool chaining) + pool-initializing gate in BetPlacement (Wave 1)
- [ ] 12-02: Fix nonce reuse in encryption.ts with unique nonce per ciphertext field (Wave 1)

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
| 4. Design System & Fog | 4/4 | Complete | 2026-03-03 |
| 5. Encrypted Betting | 4/4 | Complete | 2026-03-04 |
| 6. Resolution & Payouts | 5/5 | Complete | 2026-03-04 |
| 7. Core UI Integration | 3/3 | Complete | 2026-03-04 |
| 8. Dispute System | 0/6 | Planned | - |
| 9. Portfolio & Search | 0/4 | Not started | - |
| 10. RTG Submission | 0/3 | Not started | - |
| 11. Wire Dispute Frontend Hooks | 2/2 | Complete    | 2026-03-04 |
| 12. Pool Init & Encryption Hardening | 1/2 | In Progress|  |
