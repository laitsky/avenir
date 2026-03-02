# Feature Research

**Domain:** Confidential Prediction Markets (Solana + Arcium MPC)
**Researched:** 2026-03-02
**Confidence:** MEDIUM-HIGH (competitor features well-documented; Arcium-specific features rely on fewer sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist on any prediction market. Missing these means the product feels broken or incomplete -- users will leave immediately.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Binary market trading (Yes/No)** | Core product -- placing bets on outcomes is the entire point | HIGH | Parimutuel model with Arcium MPC encryption on pool state; the encrypted variant is significantly harder than plaintext |
| **Market feed / homepage** | Every competitor (Polymarket, Kalshi, Manifold) has a tiled grid of active markets as their landing experience | MEDIUM | Tiled cards showing question, deadline, sentiment bucket (fog-wrapped), category tag. Sort by trending/newest/ending soon/category |
| **Category browsing and filtering** | Kalshi has 2,000+ markets across Politics, Sports, Crypto, Economics, Culture. Users expect to filter by interest | LOW | Static categories initially: Politics, Crypto, Sports, Culture, Economics. Tag-based filtering |
| **Search** | Users type "Fed" on Kalshi and immediately see all related markets. Basic expectation | LOW | Full-text search across market questions, descriptions, categories |
| **Wallet connection** | Standard Solana DeFi expectation -- Phantom, Solflare, Backpack | LOW | Use @solana/wallet-adapter. Well-established pattern |
| **USDC betting** | Stablecoin betting eliminates price volatility on positions. Polymarket uses USDC on Polygon; Kalshi uses USD. Users expect stable-value bets | LOW | SPL token integration, standard Solana pattern |
| **Position / portfolio view** | Polymarket's Portfolio tab shows open positions, P&L, resolution status, grouped by category. Users expect to track their bets | MEDIUM | Dashboard listing active positions, potential payouts, market status, historical resolved bets |
| **Market detail page** | Dedicated page per market with question, description, deadline, resolution rules, activity. Polymarket and Kalshi both have rich market pages | MEDIUM | Question, description, deadline countdown, sentiment indicator (fog-wrapped), resolution source, bet placement interface |
| **Probability / sentiment display** | Polymarket shows exact probabilities (share prices). Users expect some signal about which way a market leans | MEDIUM | Avenir uses encrypted sentiment buckets (Leaning Yes / Even / Leaning No) instead of exact probabilities -- this IS the product differentiator, but some signal is table stakes |
| **Market resolution** | Markets must resolve and pay winners. Polymarket uses UMA oracle (2hr optimistic + dispute); Kalshi uses centralized team. Both have major problems | HIGH | Creator-based resolution with 48h grace period. Encrypted dispute escalation via Arcium MPC. This is where we differentiate, but having resolution at all is table stakes |
| **Winner payouts** | Automatic distribution after resolution. Users expect instant or near-instant payouts | MEDIUM | On-chain USDC distribution to winners proportional to their share of winning pool. Protocol fee (1-2%) deducted |
| **Deadline enforcement** | Markets must close at their stated time. No ambiguity about when betting stops | LOW | On-chain timestamp check, reject transactions after deadline |
| **Market creation (admin/whitelisted)** | Polymarket and Kalshi both have curated market creation. Users expect quality questions | MEDIUM | Whitelisted creator addresses. Question, outcomes, deadline, category, resolution source |
| **Transaction history** | Users expect to see their past bets, amounts, outcomes | LOW | On-chain transaction log rendered in portfolio view |
| **Responsive web design** | Polymarket's mobile app is a key driver of adoption. Web must work on mobile | MEDIUM | TanStack Start with responsive layout. Mobile-first bet placement |

### Differentiators (Competitive Advantage via Arcium Encryption)

Features that set Avenir apart. These are the reason to use Avenir over Polymarket/Kalshi. Every differentiator directly leverages Arcium MPC or addresses known competitor weaknesses.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Encrypted betting pools** | Pool totals hidden via Arcium MPC. Users bet genuine beliefs without seeing which side is winning. Eliminates herding -- the #1 manipulation vector in transparent markets where whales visibly pile into one side and retail follows. Academic research (2026) confirms biased whales + herding = sustained price distortion | VERY HIGH | Core Arcium showcase #1. Requires MPC circuit for encrypted pool accumulation. Pool state is `Enc<Mxe, u64>` -- only MXE can decrypt. This is the product's reason to exist |
| **Encrypted sentiment buckets** | Instead of total blackout, reveal fuzzy signal: "Leaning Yes / Even / Leaning No" computed inside MPC. Balances privacy with engagement -- users get directional signal without exact numbers that enable manipulation | HIGH | Requires MPC circuit that compares encrypted pool ratios against thresholds and outputs a bucket enum. Comparisons are expensive in Arcium (bit decomposition) -- circuit must be optimized |
| **Encrypted dispute resolution** | Jury votes hidden until aggregate outcome revealed. Prevents vote-herding where jurors vote with the majority to protect their stake (documented problem in UMA where a single whale with 25% of tokens overrode community). Arcium's own docs highlight this as a key use case | VERY HIGH | Core Arcium showcase #2. Each resolver's vote is `Enc<Mxe, u8>`. MPC tallies encrypted votes without revealing individual ballots. Eliminates the UMA governance attack vector |
| **Anti-whale stealth** | On Polymarket, whale trades are visible on-chain in real-time -- entire ecosystem of whale-tracking bots (Unusual Whales, PolyIntel, Polylerts) exists to copy or front-run large positions. Encrypted pools make whale positions invisible. No one can see a $500K bet and herd behind it | HIGH | Direct consequence of encrypted pools. No additional circuit needed beyond pool encryption. Massive structural advantage over transparent markets |
| **Fog-reveal visual metaphor** | Encrypted data shown under "fog" gradients that clear on resolution. Unique visual language that makes privacy tangible and beautiful rather than scary. No competitor has anything like this -- Polymarket/Kalshi show raw numbers | MEDIUM | Frontend design system. Fog overlays on pool amounts, sentiment buckets, jury votes. Fog "lifts" animation when markets resolve or disputes conclude. Earthy/forest aesthetic reinforces the concept |
| **Honest aggregate predictions** | Because bets are private, aggregate outcomes reflect genuine beliefs rather than herding cascades. This produces more accurate predictions -- the original promise of prediction markets that transparent platforms fail to deliver when whale manipulation is present | N/A (emergent) | Not a feature to build -- it emerges from encrypted pools. But it IS the value proposition to market. "The prediction market that actually predicts" |
| **No oracle dependency** | Polymarket depends on UMA (attacked via $44M market cap vs $330M TVL mismatch). Kalshi depends on internal team (5 public disputes, BBB F-rating). Creator + encrypted dispute model removes oracle single-point-of-failure | MEDIUM | Creator resolves. Community disputes. Encrypted jury decides. No external oracle protocol to trust or attack |
| **Improved resolution UX** | Polymarket: $750 bond to dispute, 2hr-to-weeks timeline, UMA whale attacks. Kalshi: no formal dispute mechanism ("yell at them in Discord"). Avenir: structured encrypted dispute with dedicated resolver pool, clear timeline, transparent-but-private process | HIGH | Resolver pool members stake USDC, cast encrypted votes during dispute window, aggregate revealed. Clear rules, clear timeline, no whale-dominated token voting |

### Anti-Features (Deliberately NOT Building)

Features that seem good but create problems. Some are explicitly out of scope per PROJECT.md; others are lessons from competitor failures.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Secondary market / early exit** | Users want to sell positions before resolution (Polymarket's order book enables this) | Parimutuel model depends on final pool ratio for payout calculation. Pre-resolution trading breaks this model. MPC share transfer adds extreme circuit complexity for v1 | Locked positions until resolution. Revisit in v2 if there is demand. Parimutuel simplicity IS the product -- it cleanly showcases Arcium |
| **Order book / AMM mechanics** | Polymarket uses CLOB, Azuro uses vAMM. Feels more "DeFi native" | Massively increases MPC circuit complexity. Order matching inside MPC is prohibitively expensive (comparisons + division). AMM requires continuous price computation. Parimutuel needs only pool accumulation | Parimutuel binary markets. Simpler circuits, hidden pool ratio directly solves herding, cleaner UX for non-traders |
| **Multi-outcome markets** | Manifold supports multiple choice. Seems like obvious extension | Each additional outcome multiplies MPC circuit complexity (more pools to encrypt, more comparisons for sentiment). Binary is the cleanest showcase | Binary (Yes/No) only for v1. Multi-outcome is a v2 feature once circuits are proven |
| **Governance token** | Azuro has AZUR token for governance. Seems standard for DeFi | Adds tokenomics complexity, regulatory risk, dilutes focus from product to speculation. Resolver pool already uses USDC stakes -- no new token needed | USDC-staked resolver pool. Clear incentive alignment without token speculation |
| **Real-time exact probability display** | Polymarket shows exact % prices updating in real-time. Feels more informative | Exact probabilities reveal pool ratios, which enables herding and whale-following. Showing exact numbers DEFEATS the entire privacy value proposition | Encrypted sentiment buckets (Leaning Yes / Even / Leaning No). Fuzzy signal preserves privacy while giving users engagement |
| **Oracle-based auto-resolution** | Chainlink or UMA integration for automatic resolution seems more "trustless" | Oracle dependency is a documented attack vector (UMA governance attack on Polymarket, $44M market cap vulnerability). External oracle adds integration complexity and trust assumptions | Creator resolution + encrypted dispute. Covers general-purpose markets without oracle dependency. Double Arcium showcase |
| **Email/social login** | Lowers onboarding friction. Polymarket uses Google login (which caused security breaches in Dec 2025) | Wallet-based auth is Solana standard. Social login adds attack surface (Polymarket's Google OAuth breaches). For RTG submission, crypto-native UX is expected | Standard Solana wallet connection (Phantom, Solflare, Backpack). Crypto-native audience for v1 |
| **Mobile native app** | Polymarket's mobile app drives significant adoption | Development cost for iOS + Android + web is 3x. Web-first with responsive design covers mobile use cases for v1. RTG judges evaluate the product, not app store presence | Responsive web app via TanStack Start. Mobile-optimized bet placement and portfolio views |
| **Copy trading / follow features** | BettorEdge and social prediction platforms add follow mechanics and copy trading | In an encrypted market, copy trading is philosophically opposed to the product -- you CANNOT see what whales are betting, and that is the point. Social features encourage herding | No copy trading. The entire value proposition is independent thinking. Leaderboards (if added later) should show accuracy, not enable copying |
| **Public comment threads** | Polymarket has comments on markets. Users discuss and share research | Polymarket's comments are described as toxic with "sexually violent comments" and no moderation. Comments require moderation infrastructure and can become manipulation vectors (coordinated shilling) | No comments for v1. If social features are added later, consider curated research/analysis links rather than open threads |
| **Whale tracking / position analytics** | Entire ecosystem exists around Polymarket whale tracking (Unusual Whales, PolyIntel, PolyTrack) | Whale tracking is a symptom of transparent markets. In Avenir, positions are encrypted -- whale tracking is structurally impossible. Building analytics that undermine your own privacy guarantees is self-defeating | Encrypted pools make this impossible by design. This is a feature, not a limitation |

## Competitor Feature Analysis

| Feature | Polymarket | Kalshi | Manifold | Azuro | Avenir Approach |
|---------|-----------|--------|----------|-------|-----------------|
| **Market model** | CLOB order book | CLOB order book | AMM | vAMM (LiquidityTree) | Parimutuel (encrypted pools) |
| **Currency** | USDC (Polygon) | USD (fiat) | Mana (play money) | Stablecoins (EVM) | USDC (Solana) |
| **Market types** | Binary + multi-outcome | Binary + range | Binary, multi, numeric, polls | Sports-focused | Binary only (v1) |
| **Market creation** | Team-curated | Team-curated | Anyone (permissionless) | Protocol-level | Whitelisted creators |
| **Position visibility** | Fully transparent on-chain | Centralized (opaque) | Transparent | On-chain | Fully encrypted via MPC |
| **Probability display** | Exact % (real-time) | Exact % + charts | Exact % + charts | Odds display | Sentiment buckets (fuzzy) |
| **Resolution** | UMA oracle (decentralized, attackable) | Internal team (centralized, no formal dispute) | Creator + community | Oracle-based | Creator + encrypted dispute |
| **Dispute mechanism** | UMA token vote ($750 bond) | None formal ("yell in Discord") | Community reporting | DAO governance | Encrypted resolver pool (USDC staked) |
| **Early exit** | Yes (order book) | Yes (order book) | Yes (AMM) | Yes (AMM) | No (locked until resolution) |
| **Mobile** | Native app (iOS/Android) | Native app (iOS/Android) | Web + PWA | Web | Responsive web (v1) |
| **Social features** | Comments, activity feed | Interactive features, leaderboard | Comments, likes, follows | Minimal | None (v1) -- privacy-first |
| **Fees** | 2% on winnings | Variable (5-10 cents/contract) | Free (play money) | LP yield model | 1-2% protocol fee on winnings |
| **US availability** | Invite-only waitlist (delayed) | 42+ states (CFTC regulated) | Global (play money) | Global (DeFi) | Global (DeFi, crypto wallets) |
| **Key weakness** | UMA oracle attacks, whale herding, toxic comments, withdrawal issues | Server outages during high volume, slow withdrawals, BBB F-rating, no dispute mechanism | Play money limits seriousness | Sports-dominated, limited market types | Locked positions, binary-only, no mobile app |

## Polymarket/Kalshi UX Patterns -- What Works and What to Improve

### What Works (Adopt)

1. **Tiled market grid homepage** -- Polymarket's card-based layout with trending row at top is effective for discovery. Each card shows question + key metric at a glance. Adopt this pattern.

2. **Category tabs** -- Both platforms use horizontal category tabs (Politics, Sports, Crypto, etc.) for quick filtering. Simple, effective. Adopt directly.

3. **Countdown timers** -- Kalshi shows settlement date countdowns. Creates urgency and clarity. Adopt on market cards and detail pages.

4. **One-tap/click bet placement** -- Pariflow (newer competitor) pioneered one-tap trade execution. Polymarket's mobile app streamlined this. For parimutuel, even simpler: pick side, enter amount, confirm. Adopt simplified flow.

5. **Portfolio grouping by category** -- Polymarket groups positions by category (Sports, Politics, etc.). Helps users track diverse bets. Adopt.

6. **Sort options** -- Kalshi allows sorting by volatility, liquidity, closing time. Polymarket tools sort by volume, newest, ending soon. Adopt: trending, newest, ending soon, category.

### What Frustrates Users (Fix in Avenir)

1. **Resolution disputes with no recourse** -- Kalshi: "yell at them in Discord." Polymarket: $750 bond, UMA whale attacks. Avenir: encrypted dispute with clear process, USDC-staked resolver pool, no whale-dominated voting.

2. **Server outages during peak events** -- Kalshi crashed during Super Bowl 2026, college football events. Use Solana's throughput + static frontend (TanStack Start SSR) to avoid single-server bottlenecks.

3. **Withdrawal delays** -- Both platforms have complaints about slow or failed withdrawals. On Solana, USDC payouts are on-chain and near-instant. No custodial middleman.

4. **Account security breaches** -- Polymarket's Google OAuth integration caused wallet drains in Dec 2025. Avenir uses standard Solana wallet connection -- users control their own keys, no OAuth vulnerability.

5. **Toxic/unmoderated comments** -- Polymarket's comment sections are described as having derogatory and sexually violent content. Avenir: no comments in v1. Privacy-first ethos means independent thinking, not social influence.

6. **Whale manipulation visibility** -- Transparent on-chain positions create an ecosystem of copy-trading and front-running. Avenir's encrypted pools eliminate this entire attack vector.

7. **Complex trading UX** -- Order books with limit orders, spreads, and market-maker mechanics confuse non-traders. Parimutuel is radically simpler: pick a side, choose an amount, confirm. No spreads, no slippage, no limit orders.

## Feature Dependencies

```
[Wallet Connection]
    |
    v
[USDC Integration] -----> [Bet Placement]
                               |
                               v
[MPC Pool Encryption] -----> [Encrypted Betting Pools]
    |                              |
    |                              v
    |                    [Sentiment Bucket Computation]
    |                              |
    v                              v
[Market Creation] ---------> [Market Feed / Homepage]
    |                              |
    v                              v
[Deadline Enforcement] ----> [Market Detail Page]
    |
    v
[Creator Resolution] -------> [Winner Payouts]
    |
    v
[Dispute System] -----------> [Encrypted Dispute Voting]
    |                              |
    v                              v
[Resolver Pool] ------------> [Dispute Outcome Reveal]
                                   |
                                   v
                              [Fallback Payout / Refund]

[Portfolio View] <---- depends on ---- [Bet Placement] + [Market Resolution]
[Transaction History] <---- depends on ---- [Bet Placement]
[Search / Filter] <---- depends on ---- [Market Creation]
```

### Dependency Notes

- **Encrypted Betting Pools require MPC Pool Encryption:** The core Arcium circuit for accumulating bets into encrypted pool state must exist before any betting can happen. This is the single highest-risk, highest-effort dependency.
- **Sentiment Buckets require Encrypted Betting Pools:** The fuzzy signal computation happens on top of the encrypted pool state. Cannot exist without pools.
- **Encrypted Dispute Voting requires Resolver Pool:** Resolver accounts must be registered and staked before they can cast encrypted votes.
- **Winner Payouts require Creator Resolution:** Payout logic triggers after resolution. Dispute system extends this with an alternative resolution path.
- **Portfolio View requires both Bet Placement and Market Resolution:** Needs to show active positions (from bets) and resolved outcomes (from resolution).
- **Market Feed requires Market Creation:** Cannot display markets that do not exist.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to validate the concept and submit to Arcium RTG.

- [ ] **Encrypted binary betting** -- Core MPC circuit + on-chain program for Yes/No parimutuel markets with encrypted pools. This IS the product.
- [ ] **Market creation (whitelisted)** -- Admin/whitelisted addresses create markets with question, outcomes, deadline, category, resolution source.
- [ ] **Wallet connection** -- Phantom, Solflare, Backpack via @solana/wallet-adapter.
- [ ] **USDC bet placement** -- Pick side (Yes/No), enter amount ($1 minimum), confirm transaction. Positions locked.
- [ ] **Encrypted sentiment buckets** -- Fuzzy signal (Leaning Yes / Even / Leaning No) displayed on market cards and detail pages.
- [ ] **Market feed homepage** -- Tiled grid with category browsing, trending/newest/ending soon sorting, search.
- [ ] **Market detail page** -- Question, description, deadline countdown, sentiment (fog-wrapped), bet placement interface.
- [ ] **Creator resolution** -- Market creator resolves after deadline with 48h grace period.
- [ ] **Encrypted dispute resolution** -- Resolver pool members cast encrypted votes via Arcium MPC. Aggregate outcome revealed.
- [ ] **Winner payouts** -- Automatic USDC distribution proportional to winning pool share, minus 1-2% protocol fee.
- [ ] **Portfolio view** -- Active positions, potential payouts, resolved history.
- [ ] **Fog design system** -- Visual fog gradients on encrypted data, fog-clear animation on resolution.

### Add After Validation (v1.x)

Features to add once core product is working and RTG submission is complete.

- [ ] **Market analytics** -- Historical sentiment bucket trends, volume indicators (can show total volume without revealing per-side breakdown).
- [ ] **Notifications** -- Deadline approaching, market resolved, dispute opened, payout received.
- [ ] **Resolver pool expansion** -- Self-service resolver registration, reputation scoring based on accuracy.
- [ ] **Multiple categories expansion** -- Beyond initial set, community-suggested categories.
- [ ] **Market creator dashboard** -- Stats on created markets, resolution history.
- [ ] **Enhanced search** -- Autocomplete, filter by deadline range, filter by minimum activity.
- [ ] **Shareable market links** -- Social sharing with OG previews showing question + sentiment bucket.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multi-outcome markets** -- Requires new MPC circuits for N-way pool encryption. Significant circuit complexity increase.
- [ ] **Secondary market / early exit** -- Would require MPC share transfer protocol. Breaks parimutuel simplicity.
- [ ] **Mobile native app** -- iOS/Android native once web product is validated.
- [ ] **Permissionless market creation** -- Open creation with spam prevention (creation fee, community curation).
- [ ] **Social features (leaderboards)** -- Accuracy-based leaderboards (opt-in). Must not enable copy-trading.
- [ ] **AI-assisted resolution** -- LLM-based resolution proposals for unambiguous markets (a16z research direction).
- [ ] **Cross-chain support** -- Accept bets from other chains via bridging.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Encrypted binary betting (MPC pools) | HIGH | VERY HIGH | P1 -- product's reason to exist |
| Market feed homepage | HIGH | MEDIUM | P1 -- first impression, discovery |
| Wallet connection | HIGH | LOW | P1 -- cannot use product without it |
| USDC bet placement | HIGH | MEDIUM | P1 -- core interaction |
| Market detail page | HIGH | MEDIUM | P1 -- where bets happen |
| Encrypted sentiment buckets | HIGH | HIGH | P1 -- engagement signal + Arcium showcase |
| Market creation (whitelisted) | HIGH | MEDIUM | P1 -- markets must exist to bet on |
| Creator resolution | HIGH | MEDIUM | P1 -- markets must resolve |
| Winner payouts | HIGH | MEDIUM | P1 -- users must get paid |
| Portfolio view | MEDIUM | MEDIUM | P1 -- users track their bets |
| Encrypted dispute resolution | HIGH | VERY HIGH | P1 -- trust in resolution + Arcium showcase #2 |
| Fog design system | MEDIUM | MEDIUM | P1 -- visual identity, RTG presentation quality |
| Category browsing / filtering | MEDIUM | LOW | P1 -- usability |
| Search | MEDIUM | LOW | P2 -- useful but not blocking |
| Transaction history | MEDIUM | LOW | P2 -- nice to have at launch |
| Deadline enforcement | HIGH | LOW | P1 -- integrity |
| Responsive mobile design | MEDIUM | MEDIUM | P2 -- web works on mobile via responsive CSS |
| Notifications | MEDIUM | MEDIUM | P2 -- engagement driver, not launch-blocking |
| Market analytics | LOW | MEDIUM | P3 -- post-validation enhancement |
| Shareable links | LOW | LOW | P2 -- growth mechanic |

**Priority key:**
- P1: Must have for launch / RTG submission
- P2: Should have, add when possible post-launch
- P3: Nice to have, future consideration

## Sources

- [Polymarket Documentation](https://docs.polymarket.com/) -- MEDIUM confidence (official docs)
- [Polymarket Product Case Study](https://medium.com/@zabdelkarim1/polymarket-product-case-study-2b1a8ed81e7c) -- LOW confidence (third-party analysis)
- [Arcium: The Future of Prediction Markets](https://www.arcium.com/articles/the-future-of-prediction-markets-using-arcium) -- HIGH confidence (official Arcium article)
- [How Kalshi and Polymarket Settle Markets](https://defirate.com/prediction-markets/how-contracts-settle/) -- MEDIUM confidence (detailed multi-source analysis)
- [Kalshi Review 2026 (PokerNews)](https://www.pokernews.com/prediction-markets/kalshi/) -- MEDIUM confidence (verified review)
- [Kalshi vs Polymarket Comparison](https://laikalabs.ai/prediction-markets/kalshi-vs-polymarket) -- MEDIUM confidence (comparison site)
- [Manipulation in Prediction Markets (Oxford/arXiv 2026)](https://arxiv.org/html/2601.20452v1) -- HIGH confidence (academic research)
- [Oracle Manipulation in Polymarket 2025](https://orochi.network/blog/oracle-manipulation-in-polymarket-2025) -- MEDIUM confidence (documented incident)
- [Polymarket Whale Loss Analysis](https://www.ainvest.com/news/structural-risks-prediction-market-trading-lessons-2m-polymarket-whale-loss-2601/) -- MEDIUM confidence (documented incident)
- [Prediction Markets vs Insider Trading (CoinDesk 2026)](https://www.coindesk.com/business/2026/02/13/prediction-markets-vs-insider-trading-founders-admit-blockchain-transparency-is-the-only-defense) -- MEDIUM confidence (industry reporting)
- [Prediction Market Statistics 2026 (Gambling Insider)](https://www.gamblinginsider.com/in-depth/110180/prediction-market-statistics) -- MEDIUM confidence (industry data)
- [Azuro Protocol Documentation](https://gem.azuro.org/knowledge-hub/introduction/what-is-azuro) -- MEDIUM confidence (official docs)
- [Manifold Markets FAQ](https://docs.manifold.markets/faq) -- MEDIUM confidence (official docs)
- [Arcium MPC Protocols Documentation](https://docs.arcium.com/multi-party-execution-environments-mxes/mpc-protocols) -- HIGH confidence (official docs)

---
*Feature research for: Confidential Prediction Markets (Avenir)*
*Researched: 2026-03-02*
