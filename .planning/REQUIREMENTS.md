# Requirements: Avenir

**Defined:** 2026-03-02
**Core Value:** Encrypted betting pools that prevent herding — users bet their genuine belief without seeing which side is winning

## v1 Requirements

Requirements for initial release / RTG submission. Each maps to roadmap phases.

### Core Betting

- [x] **BET-01**: User can place a Yes or No bet on a binary market with USDC (minimum $1)
- [x] **BET-02**: User's bet amount is encrypted via Arcium MPC and added to the encrypted pool
- [x] **BET-03**: Pool totals (yes_pool, no_pool) remain encrypted throughout the market lifecycle
- [x] **BET-04**: User can view encrypted sentiment bucket (Leaning Yes / Even / Leaning No) on live markets
- [x] **BET-05**: Sentiment bucket is computed inside MPC using multiplication-based comparison (no division)
- [x] **BET-06**: User's position is locked until market resolution (no early exit)
- [x] **BET-07**: Minimum bet is 1 USDC (1,000,000 token units), no maximum

### Market Management

- [x] **MKT-01**: Whitelisted address can create a binary market with question, outcomes, deadline, category, and resolution source
- [x] **MKT-02**: Markets are organized by category (Politics, Crypto, Sports, Culture, Economics)
- [x] **MKT-03**: Bets are rejected after market deadline passes (on-chain timestamp validation)
- [x] **MKT-04**: Each market has a PDA-owned USDC vault for fund custody

### Resolution & Disputes

- [x] **RES-01**: Market creator can resolve the market by declaring the winning outcome
- [ ] **RES-02**: Resolution has a 48-hour grace period after market deadline
- [ ] **RES-03**: After grace period, any market participant can trigger dispute escalation
- [ ] **RES-04**: Dedicated resolver pool members can stake USDC to become eligible jurors
- [ ] **RES-05**: Resolver votes are encrypted via Arcium MPC (no juror sees other votes)
- [ ] **RES-06**: Dispute outcome is determined by stake-weighted encrypted vote tally
- [x] **RES-07**: Winners receive instant USDC payout proportional to their share of the winning pool
- [x] **RES-08**: Protocol fee of 1-2% is deducted from winning payouts
- [x] **RES-09**: Payout calculation uses plaintext math after pool totals are revealed at resolution

### User Experience

- [x] **UX-01**: Homepage displays a tiled market feed with category tabs and sorting (trending, newest, ending soon)
- [x] **UX-02**: Market detail page shows question, description, deadline countdown, fog-wrapped sentiment, and bet placement interface
- [x] **UX-03**: User can connect Solana wallet (Phantom, Solflare, Backpack)
- [ ] **UX-04**: Portfolio view shows active positions, potential payouts, and resolved bet history
- [ ] **UX-05**: Full-text search across market questions, descriptions, and categories
- [x] **UX-06**: Fog gradients overlay encrypted data (pool amounts, sentiment, jury votes, market cards)
- [x] **UX-07**: Fog clears with animation when data is revealed (resolution, dispute outcome)
- [ ] **UX-08**: Responsive design works on mobile browsers

### Infrastructure

- [x] **INF-01**: Solana program built with Anchor 0.32.1 + Arcium v0.4.0
- [x] **INF-02**: Four MPC circuits: update_pool, compute_payouts, add_dispute_vote, finalize_dispute
- [x] **INF-03**: Encrypted state relay pattern — ciphertext stored on-chain, passed to MPC, updated via callback
- [x] **INF-04**: Sequential lock prevents concurrent bet race conditions (one MPC computation at a time per market)
- [x] **INF-05**: Frontend built with TanStack Start, Tailwind v4, shadcn/ui
- [x] **INF-06**: Forest/fog design system — deep forest green, sage, muted gold accents, warm dark background
- [x] **INF-07**: Client-side encryption via @arcium-hq/client (x25519 key exchange, RescueCipher)

### RTG Submission

- [ ] **RTG-01**: Open-source GitHub repository with clear documentation
- [ ] **RTG-02**: README explains what's encrypted, why it matters, and how Arcium enables it
- [ ] **RTG-03**: Architecture diagram showing encrypted vs. plaintext data flow

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: User receives notification when market they bet on resolves
- **NOTF-02**: User receives notification when dispute is opened on their market
- **NOTF-03**: User receives notification when payout is available

### Market Enhancements

- **ENH-01**: Multi-outcome markets (3+ choices per question)
- **ENH-02**: Permissionless market creation with spam prevention (creation fee)
- **ENH-03**: Market analytics — historical sentiment trends, volume indicators
- **ENH-04**: Shareable market links with OG previews

### Resolver Pool Expansion

- **RSLV-01**: Self-service resolver registration
- **RSLV-02**: Resolver reputation scoring based on accuracy history
- **RSLV-03**: Resolver slashing for consistently wrong votes

### Scale

- **SCAL-01**: Batched epoch model for concurrent bets (replace sequential lock)
- **SCAL-02**: Indexer with PostgreSQL + Helius webhooks for fast market queries

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Secondary market / early exit | Parimutuel depends on final pool ratio; MPC share transfer too complex for v1 |
| AMM or order book mechanics | Prohibitively expensive inside MPC; parimutuel is simpler and better showcases Arcium |
| Governance token | Adds tokenomics complexity; resolver pool uses USDC stakes, no new token needed |
| Email/social login | Standard wallet connect for crypto-native audience; OAuth caused Polymarket breaches |
| Mobile native app | Web-first with responsive design; TanStack Start SSR covers mobile |
| Real-time exact probability display | Revealing exact pool ratios defeats the privacy value proposition |
| Oracle-based auto-resolution | Oracle dependency is documented attack vector; creator + dispute model is safer |
| Copy trading / follow features | Philosophically opposed to encrypted markets — the point is independent thinking |
| Public comment threads | Polymarket comments are toxic; no moderation infrastructure for v1 |
| Whale tracking / position analytics | Encrypted pools make this structurally impossible — this is a feature, not a limitation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BET-01 | Phase 5: Encrypted Betting | Complete |
| BET-02 | Phase 5: Encrypted Betting | Complete |
| BET-03 | Phase 5: Encrypted Betting | Complete |
| BET-04 | Phase 5: Encrypted Betting | Complete |
| BET-05 | Phase 5: Encrypted Betting | Complete |
| BET-06 | Phase 5: Encrypted Betting | Complete |
| BET-07 | Phase 5: Encrypted Betting | Complete |
| MKT-01 | Phase 2: Market Creation | Complete |
| MKT-02 | Phase 2: Market Creation | Complete |
| MKT-03 | Phase 2: Market Creation | Complete |
| MKT-04 | Phase 1: Foundation | Complete |
| RES-01 | Phase 6: Resolution & Payouts | Complete |
| RES-02 | Phase 8: Dispute System | Pending |
| RES-03 | Phase 8: Dispute System | Pending |
| RES-04 | Phase 8: Dispute System | Pending |
| RES-05 | Phase 8: Dispute System | Pending |
| RES-06 | Phase 8: Dispute System | Pending |
| RES-07 | Phase 6: Resolution & Payouts | Complete |
| RES-08 | Phase 6: Resolution & Payouts | Complete |
| RES-09 | Phase 6: Resolution & Payouts | Complete |
| UX-01 | Phase 7: Core UI Integration | Complete |
| UX-02 | Phase 7: Core UI Integration | Complete |
| UX-03 | Phase 7: Core UI Integration | Complete |
| UX-04 | Phase 9: Portfolio & Search | Pending |
| UX-05 | Phase 9: Portfolio & Search | Pending |
| UX-06 | Phase 4: Design System & Fog | Complete |
| UX-07 | Phase 4: Design System & Fog | Complete |
| UX-08 | Phase 9: Portfolio & Search | Pending |
| INF-01 | Phase 1: Foundation | Complete |
| INF-02 | Phase 3: Arcium MPC Core | Complete |
| INF-03 | Phase 3: Arcium MPC Core | Complete |
| INF-04 | Phase 5: Encrypted Betting | Complete |
| INF-05 | Phase 1: Foundation | Complete |
| INF-06 | Phase 4: Design System & Fog | Complete |
| INF-07 | Phase 3: Arcium MPC Core | Complete |
| RTG-01 | Phase 10: RTG Submission | Pending |
| RTG-02 | Phase 10: RTG Submission | Pending |
| RTG-03 | Phase 10: RTG Submission | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation*
