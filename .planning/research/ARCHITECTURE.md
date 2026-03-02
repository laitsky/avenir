# Architecture Patterns

**Domain:** Confidential prediction market (Solana + Arcium MPC)
**Researched:** 2026-03-02

## Recommended Architecture

Avenir is a four-layer system: a **Solana on-chain program** orchestrates market state and token custody, **Arcium MPC circuits** execute confidential computations over encrypted bet data, a **frontend client** handles encryption/decryption and UX, and an **indexer/cache layer** provides fast read access for the UI. The critical insight is that Arcium is stateless at the protocol level -- each MPC computation is a one-shot function call. Persistent encrypted state must be stored on-chain (as ciphertext in Solana accounts) and passed back into subsequent MPC computations as input. This shapes the entire architecture.

```
+-------------------+       +--------------------+       +-------------------+
|                   |       |                    |       |                   |
|  Frontend Client  |<----->|  Solana Program    |<----->|  Arcium MPC       |
|  (TanStack Start) |       |  (Anchor/Arcium)   |       |  Cluster          |
|                   |       |                    |       |                   |
+-------------------+       +--------------------+       +-------------------+
        |                          |                            |
        |  1. Encrypt bet locally  |                            |
        |  2. Submit tx            |                            |
        |------------------------->|  3. Queue computation      |
        |                          |--------------------------->|
        |                          |                            |  4. MPC executes
        |                          |                            |     over shares
        |                          |  5. Callback with result   |
        |                          |<---------------------------|
        |                          |  6. Store encrypted state  |
        |  7. Event emitted        |                            |
        |<-------------------------|                            |
        |  8. Decrypt & display    |                            |
        |                          |                            |
+-------------------+       +--------------------+
|                   |       |                    |
|  Indexer / Cache  |<------|  Helius Webhooks   |
|  (PostgreSQL)     |       |  or WebSockets     |
|                   |       |                    |
+-------------------+       +--------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Solana Program** (Anchor + Arcium macros) | Market CRUD, token custody (USDC vault), encrypted state storage, computation queueing via CPI to Arcium Program, callback handling | Arcium Program (CPI), SPL Token Program (CPI), Frontend (transactions), Indexer (events) |
| **Arcium MPC Circuits** (Arcis Rust DSL) | Encrypted pool accumulation, sentiment bucket computation, payout calculation, dispute vote tallying | Solana Program (receives queued computations, returns results via callback) |
| **Frontend Client** (TanStack Start + Arcium TS SDK) | Wallet connection, x25519 key exchange, Rescue cipher encryption of bets, transaction submission, result decryption, UI rendering | Solana Program (transactions), Indexer (reads), Arcium SDK (encryption) |
| **Indexer / Cache** (PostgreSQL + Helius webhooks) | Parse on-chain events, cache market metadata, serve fast queries for market feed, track computation status | Solana (event subscription), Frontend (API queries) |
| **USDC Vault** (PDA-owned SPL token account) | Custody of all bet funds per market, controlled by program PDA | Solana Program (CPI transfers) |

---

## Core Data Flow: Bet Lifecycle

The complete lifecycle of a bet from submission to payout follows this sequence.

### Phase 1: Bet Submission

```
User                    Frontend                 Solana Program          Arcium Cluster
 |                         |                          |                       |
 |  "Bet 50 USDC on Yes"  |                          |                       |
 |------------------------>|                          |                       |
 |                         |  1. x25519 key exchange  |                       |
 |                         |     with MXE cluster     |                       |
 |                         |  2. Encrypt bet amount   |                       |
 |                         |     & outcome with       |                       |
 |                         |     Rescue cipher        |                       |
 |                         |  3. Build & sign tx:     |                       |
 |                         |     - Transfer 50 USDC   |                       |
 |                         |       to market vault    |                       |
 |                         |     - Call place_bet ix  |                       |
 |                         |       with ciphertext    |                       |
 |                         |------------------------->|                       |
 |                         |                          |  4. Validate bet      |
 |                         |                          |     (market active,   |
 |                         |                          |      USDC transferred)|
 |                         |                          |  5. Store user's      |
 |                         |                          |     encrypted bet in  |
 |                         |                          |     position account  |
 |                         |                          |  6. Queue "update     |
 |                         |                          |     pool" computation |
 |                         |                          |     via CPI, passing: |
 |                         |                          |     - encrypted bet   |
 |                         |                          |     - current pool    |
 |                         |                          |       ciphertext      |
 |                         |                          |--------------------->|
 |                         |                          |                      | 7. MPC adds bet
 |                         |                          |                      |    to encrypted
 |                         |                          |                      |    pool totals
 |                         |                          |                      |    + recomputes
 |                         |                          |                      |    sentiment
 |                         |                          |  8. Callback:        |
 |                         |                          |     new pool cipher  |
 |                         |                          |     + sentiment enum |
 |                         |                          |<---------------------|
 |                         |                          |  9. Store updated    |
 |                         |                          |     pool ciphertext  |
 |                         |                          |     in market acct   |
 |                         |                          | 10. Emit event with  |
 |                         |                          |     sentiment bucket |
 |                         |  11. Index event         |                      |
 |                         |<-------------------------|                      |
 |  12. Display updated    |                          |                      |
 |      sentiment bucket   |                          |                      |
 |<------------------------|                          |                      |
```

### Phase 2: Resolution

```
Creator                 Solana Program          Arcium Cluster
 |                          |                       |
 |  "Resolve: Yes wins"    |                       |
 |------------------------->|                       |
 |                          |  1. Validate creator  |
 |                          |     + within grace    |
 |                          |  2. Store resolution  |
 |                          |     outcome on-chain  |
 |                          |  3. Queue "compute    |
 |                          |     payouts" MPC:     |
 |                          |     - pool ciphertext |
 |                          |     - winning outcome |
 |                          |--------------------->|
 |                          |                      | 4. Decrypt pool
 |                          |                      |    totals inside MPC
 |                          |                      |    Compute payout
 |                          |                      |    ratio (winner
 |                          |                      |    share of total)
 |                          |  5. Callback:        |
 |                          |     payout ratio as  |
 |                          |     revealed value   |
 |                          |<---------------------|
 |                          |  6. Store payout     |
 |                          |     multiplier       |
 |                          |     on-chain         |
 |                          |  7. Set market state |
 |                          |     = Resolved       |
```

### Phase 3: Claim Payout

```
Winner                  Frontend                Solana Program
 |                         |                          |
 |  "Claim winnings"       |                          |
 |------------------------>|                          |
 |                         |  1. Build claim tx       |
 |                         |------------------------->|
 |                         |                          |  2. Verify user bet  |
 |                         |                          |     on winning side  |
 |                         |                          |  3. Calculate payout:|
 |                         |                          |     user_bet *       |
 |                         |                          |     payout_ratio     |
 |                         |                          |  4. Transfer USDC    |
 |                         |                          |     from vault to    |
 |                         |                          |     user wallet      |
 |                         |                          |  5. Mark claimed     |
 |                         |  6. Confirm              |                      |
 |                         |<-------------------------|                      |
 |  "Received X USDC"      |                          |                      |
 |<------------------------|                          |                      |
```

### Phase 4: Dispute (If Resolution Challenged)

```
Challenger              Solana Program          Arcium Cluster
 |                          |                       |
 |  "Dispute resolution"   |                       |
 |  (after grace period)   |                       |
 |------------------------->|                       |
 |                          |  1. Validate grace    |
 |                          |     period expired    |
 |                          |  2. Set market state  |
 |                          |     = Disputed        |
 |                          |                       |

Resolver (from pool)    Solana Program          Arcium Cluster
 |                          |                       |
 |  "Vote: Yes was right"  |                       |
 |  (encrypted vote)       |                       |
 |------------------------->|                       |
 |                          |  3. Queue "add vote"  |
 |                          |     computation       |
 |                          |--------------------->|
 |                          |                      | 4. Accumulate
 |                          |                      |    encrypted vote
 |                          |  5. Callback:        |
 |                          |     updated tally    |
 |                          |<---------------------|
 |                          |                       |
 |   ... more voters ...   |                       |
 |                          |                       |
 |   (voting period ends)  |                       |
 |                          |  6. Queue "finalize   |
 |                          |     dispute" MPC      |
 |                          |--------------------->|
 |                          |                      | 7. Reveal winning
 |                          |                      |    outcome from
 |                          |                      |    vote tally
 |                          |  8. Callback:        |
 |                          |     dispute outcome  |
 |                          |<---------------------|
 |                          |  9. Override or       |
 |                          |     confirm original  |
 |                          |     resolution        |
```

---

## Account Model Design

### Solana Program Accounts (PDAs)

```
Config (PDA: [b"config"])
├── admin: Pubkey
├── fee_recipient: Pubkey
├── usdc_mint: Pubkey
├── protocol_fee_bps: u16
├── market_counter: u64
├── paused: bool
└── bump: u8

Market (PDA: [b"market", market_id.to_le_bytes()])
├── market_id: u64
├── creator: Pubkey
├── question: [u8; 200]          // fixed-size, padded
├── category: u8
├── deadline: i64
├── resolution_deadline: i64     // deadline + 48h grace
├── state: MarketState           // Active | Resolved | Disputed | Cancelled
├── winning_outcome: Option<u8>  // 0=Yes, 1=No
├── payout_ratio_bps: Option<u64>  // revealed after resolution MPC
├── encrypted_yes_pool: [u8; 32]  // Enc<Mxe, u64> ciphertext
├── encrypted_no_pool: [u8; 32]   // Enc<Mxe, u64> ciphertext
├── pool_nonce: u128              // nonce for pool ciphertexts
├── sentiment: u8                 // 0=Leaning Yes, 1=Even, 2=Leaning No
├── total_bets: u64              // plaintext count (not amounts)
└── bump: u8

MarketVault (PDA: [b"vault", market_id.to_le_bytes()])
└── SPL Token Account (USDC), authority = Market PDA

UserPosition (PDA: [b"position", market_id.to_le_bytes(), user.key()])
├── market_id: u64
├── user: Pubkey
├── encrypted_yes_amount: [u8; 32]  // Enc<Mxe, u64>
├── encrypted_no_amount: [u8; 32]   // Enc<Mxe, u64>
├── position_nonce: u128
├── plaintext_total: u64          // total USDC deposited (plaintext, for claim calc)
├── outcome_side: u8              // 0=Yes, 1=No (can be public -- which side, not how much)
├── claimed: bool
└── bump: u8

DisputeState (PDA: [b"dispute", market_id.to_le_bytes()])
├── market_id: u64
├── challenger: Pubkey
├── encrypted_yes_votes: [u8; 32]  // Enc<Mxe, u64>
├── encrypted_no_votes: [u8; 32]   // Enc<Mxe, u64>
├── vote_nonce: u128
├── voting_deadline: i64
├── total_voters: u64
├── resolved: bool
└── bump: u8

ResolverStake (PDA: [b"resolver", user.key()])
├── user: Pubkey
├── staked_amount: u64
├── active: bool
└── bump: u8
```

### Key Design Decision: What Is Encrypted vs. Plaintext

| Data | Storage | Rationale |
|------|---------|-----------|
| Pool totals (yes_pool, no_pool) | `Enc<Mxe, u64>` on-chain | Core privacy feature -- prevents herding |
| Individual bet amounts | `Enc<Mxe, u64>` on-chain | Prevents whale tracking |
| Bet side (Yes/No) | Plaintext | Can be public since pool ratios are hidden. Alternatively encrypt this too -- tradeoff is more complex circuits |
| Sentiment bucket | Plaintext (derived in MPC, revealed) | "Leaning Yes/Even/Leaning No" -- intentionally coarse signal |
| Total bet count | Plaintext | Shows market activity without revealing amounts |
| Payout ratio | Plaintext (revealed post-resolution) | Must be public for users to verify claims |
| Dispute votes | `Enc<Mxe, u64>` on-chain | Prevents voter herding (same principle as bets) |
| User total deposit | Plaintext | Needed for payout calculation: user_deposit * payout_ratio / SCALE |
| USDC vault balance | Plaintext (SPL token account) | Inherently visible on-chain -- this is fine since it shows total market size but not per-side breakdown |

**CRITICAL NOTE on `Enc<Mxe, u64>` vs `Enc<Shared, u64>`:** Use `Enc<Mxe, T>` for persistent pool state. `Enc<Mxe, T>` is decryptable only by the MXE cluster collectively, meaning no single node (and no external party) can read it. This is the correct choice for pool totals that must remain secret even from the original encryptor. `Enc<Shared, T>` would be decryptable by both the client and the MXE -- wrong for pool state since we don't want any single user to decrypt the pool.

---

## Arcium MPC Circuit Design

### Circuit 1: Update Pool (called on every bet)

```rust
#[encrypted]
mod pool_circuits {
    pub struct UpdatePoolInput {
        current_yes_pool: u64,    // Enc<Mxe, u64> -- current encrypted pool
        current_no_pool: u64,     // Enc<Mxe, u64>
        bet_amount: u64,          // Enc<Shared, u64> -- user's bet
        is_yes: bool,             // plaintext: which side
    }

    #[instruction]
    pub fn update_pool(
        pool_state: Enc<Mxe, (u64, u64)>,  // (yes_pool, no_pool)
        bet: Enc<Shared, u64>,               // user's encrypted bet
        is_yes: bool,                        // plaintext side
    ) -> (Enc<Mxe, (u64, u64)>, u8) {       // new pool state + sentiment bucket
        let (mut yes_pool, mut no_pool) = pool_state.to_arcis();
        let amount = bet.to_arcis();

        // Conditional add -- both branches execute, result selected
        let new_yes = yes_pool + amount;   // cost paid regardless
        let new_no = no_pool + amount;     // cost paid regardless
        yes_pool = if is_yes { new_yes } else { yes_pool };
        no_pool = if !is_yes { new_no } else { no_pool };

        // Compute sentiment bucket (comparisons are expensive)
        let total = yes_pool + no_pool;
        // Avoid division -- use multiplication comparison instead
        // yes_pool > 0.6 * total  <=>  5 * yes_pool > 3 * total
        let leaning_yes = (yes_pool * 5) > (total * 3);
        let leaning_no = (no_pool * 5) > (total * 3);

        let sentiment: u8 = if leaning_yes { 0 }
                           else if leaning_no { 2 }
                           else { 1 };

        let new_pool = Enc::<Mxe, _>::from_arcis((yes_pool, no_pool));
        let revealed_sentiment = sentiment.reveal();

        (new_pool, revealed_sentiment)
    }
}
```

**Cost optimization notes:**
- `is_yes` is plaintext so the conditional is "free" (compiler can optimize since condition is public). **Confidence: MEDIUM** -- need to verify if Arcis optimizes on public conditionals vs always executing both branches.
- Sentiment uses multiplication instead of division (5*yes > 3*total instead of yes/total > 0.6). Division in MPC is very expensive.
- Two comparisons for sentiment. Comparisons use bit decomposition -- expensive but unavoidable. Reuse where possible.

### Circuit 2: Compute Payouts (called once at resolution)

```rust
#[instruction]
pub fn compute_payouts(
    pool_state: Enc<Mxe, (u64, u64)>,   // encrypted pool
    winning_side: bool,                   // plaintext: true=Yes, false=No
) -> (u64, u64) {                        // revealed: (winning_pool, total_pool)
    let (yes_pool, no_pool) = pool_state.to_arcis();

    let winning_pool = if winning_side { yes_pool } else { no_pool };
    let total_pool = yes_pool + no_pool;

    // Reveal both values -- resolution is the moment privacy ends
    (winning_pool.reveal(), total_pool.reveal())
}
```

At resolution, the actual pool numbers become public. The payout ratio is `total_pool / winning_pool` (computed on-chain in plaintext after reveal). Each winner gets `user_bet * total_pool / winning_pool` minus protocol fee.

### Circuit 3: Accumulate Dispute Vote

```rust
#[instruction]
pub fn add_dispute_vote(
    vote_tally: Enc<Mxe, (u64, u64)>,   // (yes_votes, no_votes)
    vote: Enc<Shared, bool>,             // encrypted vote
    stake_weight: u64,                   // plaintext: resolver's stake
) -> Enc<Mxe, (u64, u64)> {             // updated tally
    let (mut yes_count, mut no_count) = vote_tally.to_arcis();
    let is_yes = vote.to_arcis();

    // Weight vote by stake
    let weight = stake_weight;  // plaintext, no conversion needed
    yes_count = if is_yes { yes_count + weight } else { yes_count };
    no_count = if !is_yes { no_count + weight } else { no_count };

    Enc::<Mxe, _>::from_arcis((yes_count, no_count))
}
```

### Circuit 4: Finalize Dispute

```rust
#[instruction]
pub fn finalize_dispute(
    vote_tally: Enc<Mxe, (u64, u64)>,
) -> u8 {  // revealed: winning outcome
    let (yes_votes, no_votes) = vote_tally.to_arcis();
    let yes_wins = yes_votes > no_votes;
    let outcome: u8 = if yes_wins { 0 } else { 1 };
    outcome.reveal()
}
```

---

## Patterns to Follow

### Pattern 1: Encrypted State Relay

**What:** Since Arcium is stateless, encrypted pool state lives on-chain as ciphertext and is passed into each MPC computation as input, then the updated ciphertext is written back on-chain via callback.

**When:** Every operation that reads or modifies encrypted pool/vote state.

**Why this matters:** This is the fundamental architectural pattern. Without understanding this, the entire system design breaks. The Solana program is the "database" for encrypted state. Arcium is the "compute engine" that temporarily operates on it.

```
On-chain Account          MPC Circuit              On-chain Account
[encrypted_pool] -------> [to_arcis() -> compute -> from_arcis()] -------> [new_encrypted_pool]
(ciphertext in)            (secret shares inside)                          (ciphertext out)
```

**Confidence:** HIGH -- confirmed by Arcium docs: "The Arcium Network is stateless... Computation Customers can employ external mechanisms to manage data persistence across computations."

### Pattern 2: Minimize MPC Round-Trips

**What:** Batch related operations into a single MPC computation to reduce latency and cost.

**When:** When multiple encrypted operations could logically happen together.

**Example:** The `update_pool` circuit both updates pool totals AND computes sentiment in one computation, rather than two separate MPC calls. Each MPC round-trip involves queuing, cluster pickup, execution, and callback -- likely 2-10 seconds of latency.

### Pattern 3: Reveal at Boundaries

**What:** Keep data encrypted during active market lifecycle. Reveal only at transition points (resolution, dispute finalization) and only reveal the minimum needed.

**When:** Designing what to encrypt vs. reveal.

**Key reveals:**
- Sentiment bucket: revealed as coarse enum (not exact ratio) during active market
- Pool totals: revealed only at resolution
- Dispute outcome: revealed only when dispute finalizes
- Individual bet amounts: NEVER revealed (only user knows their own bet)

### Pattern 4: PDA-as-Vault with Encrypted Metadata

**What:** Follow standard Solana pattern of PDA-owned token accounts for fund custody, but pair with encrypted metadata accounts that only MPC can interpret.

**When:** Every market that holds funds.

```
Market PDA ---- owns ----> USDC Vault (SPL token account)
    |
    +--- stores ----------> encrypted_yes_pool (ciphertext)
    +--- stores ----------> encrypted_no_pool (ciphertext)
    +--- stores ----------> sentiment (plaintext, derived from MPC)
```

### Pattern 5: Async Computation Awareness

**What:** MPC computations are asynchronous. The `place_bet` instruction queues a computation; the `update_pool_callback` instruction fires later when the cluster completes. The UI must handle this intermediate state.

**When:** Every user-facing action that triggers MPC.

**Implementation:**
- Frontend calls `awaitComputationFinalization()` from Arcium TS SDK
- Show a "processing" state in UI (fog animation over the market card)
- On callback event, update the displayed sentiment

**Race condition concern:** If two bets arrive before the first callback completes, the second bet would use stale pool ciphertext. This requires serialization -- either a mutex/lock pattern on-chain (reject bets while computation pending) or a queue that batches bets within an epoch.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Encrypted State Only Off-Chain

**What:** Keeping encrypted pool state in an off-chain database instead of on-chain Solana accounts.

**Why bad:** Breaks composability, auditability, and trust model. Users can't verify the encrypted state exists on-chain. The whole point of blockchain is verifiable state.

**Instead:** Store ciphertext in Solana PDA accounts. It's just bytes -- Solana doesn't need to understand the ciphertext, just store it.

### Anti-Pattern 2: Division in MPC Circuits

**What:** Using division or modulo operations inside encrypted computations.

**Why bad:** Division is extremely expensive in MPC (requires iterative protocols). Arcium docs explicitly warn about this.

**Instead:** Use multiplication-based comparisons (e.g., `a * d > b * c` instead of `a/b > c/d`). Defer division to plaintext computation after reveal (e.g., payout calculation happens on-chain after pool totals are revealed at resolution).

### Anti-Pattern 3: Dynamic-Size Data in Circuits

**What:** Using `Vec<T>`, `String`, or variable-length structures in Arcis circuits.

**Why bad:** MPC circuits are fixed at compile time. Arcis does not support Vec or String. All data structures must be fixed-size arrays `[T; N]`.

**Instead:** Use `[u8; 200]` for question text (padded), fixed-size arrays for any collection, and `Pack<T>` for efficient storage of small-value arrays.

### Anti-Pattern 4: Revealing Intermediate Pool State

**What:** Revealing exact pool ratios or amounts during active market.

**Why bad:** Defeats the core value proposition. If users see "72% on Yes," they herd toward Yes (or contrarian-trade against it). The whole point of encryption is preventing this.

**Instead:** Reveal only coarse sentiment buckets ("Leaning Yes" / "Even" / "Leaning No") with wide thresholds (e.g., 60/40 split).

### Anti-Pattern 5: One MPC Call Per User For Claims

**What:** Using an MPC computation to calculate each individual user's payout.

**Why bad:** After resolution, pool totals are revealed. Payout math is simple multiplication/division on plaintext numbers. No need for MPC.

**Instead:** Reveal pool totals at resolution via MPC (one call). Then compute payouts in the Solana program using plaintext arithmetic: `user_payout = user_bet * total_pool / winning_pool`.

---

## Concurrency Model: Handling Simultaneous Bets

This is the hardest architectural problem. Since pool state is encrypted and updated via async MPC, two simultaneous bets create a race condition.

### Option A: Sequential Lock (Recommended for V1)

```
Market Account includes: computation_pending: bool

place_bet instruction:
  1. Check computation_pending == false
  2. Set computation_pending = true
  3. Transfer USDC to vault
  4. Store user position
  5. Queue MPC computation

update_pool_callback:
  1. Store new encrypted pool state
  2. Set computation_pending = false
```

**Tradeoff:** Only one bet processes at a time. During MPC computation (2-10 seconds), other bets are rejected. Users must retry.

**Mitigation:** Frontend shows "Market updating, please wait" during pending computation. Auto-retry with backoff.

### Option B: Batched Epoch Model (Better for Scale)

```
Market Account includes:
  pending_bets: [PendingBet; MAX_BATCH]  // fixed-size array
  pending_count: u8
  epoch_deadline: i64  // batch window (e.g., every 30 seconds)

place_bet instruction:
  1. Transfer USDC to vault
  2. Add encrypted bet to pending_bets array
  3. If pending_count == MAX_BATCH or clock > epoch_deadline:
     Queue "batch_update_pool" MPC with all pending bets

batch_update_pool circuit:
  Processes all bets in one MPC call
```

**Tradeoff:** More complex circuit (fixed-size loop over batch), higher MPC cost per call, but better throughput. Bets accumulate in plaintext pending slots until batch processes.

**Recommendation:** Start with Option A (sequential lock). It is simpler, sufficient for early usage, and validates the core MPC integration. Move to Option B when market volume demands it.

---

## Suggested Build Order

The dependency graph dictates this ordering.

### Layer 1: Foundation (must build first)

1. **Solana Program skeleton** -- Config, Market, UserPosition account structs with Anchor. Standard instructions: initialize, create_market, place_bet (without MPC -- plaintext pools for testing), resolve, claim.
2. **USDC vault pattern** -- PDA-owned SPL token accounts, transfer logic.

*Why first:* Everything depends on the on-chain state model. This can be fully tested without Arcium.

### Layer 2: Arcium Integration

3. **Arcium project setup** -- `arcium init`, configure MXE, deploy computation definitions.
4. **update_pool circuit** -- The core circuit. Takes encrypted pool + bet, returns new pool + sentiment.
5. **On-chain MPC orchestration** -- Modify `place_bet` to queue MPC computation, add `update_pool_callback` handler, store encrypted state.
6. **compute_payouts circuit** -- Resolution circuit. Reveal pool totals.
7. **Concurrency handling** -- Implement sequential lock (Option A).

*Why second:* Depends on stable account model from Layer 1. This is the highest-risk layer.

### Layer 3: Dispute System

8. **Resolver pool** -- ResolverStake accounts, staking/unstaking.
9. **add_dispute_vote circuit** -- Encrypted vote accumulation.
10. **finalize_dispute circuit** -- Reveal dispute outcome.
11. **Dispute orchestration** -- On-chain dispute state machine.

*Why third:* Dispute reuses the same MPC patterns as betting (encrypted accumulation + reveal). Build confidence with betting first.

### Layer 4: Frontend + Indexer

12. **Indexer** -- Parse market events, cache in PostgreSQL. Helius webhooks for real-time updates.
13. **Frontend** -- TanStack Start app. Wallet connection, market feed, bet placement with Arcium TS SDK encryption, fog UI over encrypted data.
14. **Computation status tracking** -- `awaitComputationFinalization()` integration, loading states.

*Why last:* Frontend needs stable program interface. Indexer needs finalized event schema. Both are lower-risk (standard web dev patterns).

### Dependency Graph

```
[1. Program Skeleton] ─────────────────────────────────┐
         │                                               │
         v                                               v
[2. USDC Vault] ────────────────────────────────> [12. Indexer]
         │                                               │
         v                                               v
[3. Arcium Setup]                                 [13. Frontend]
         │                                               │
         v                                               v
[4. update_pool Circuit]                          [14. Status Tracking]
         │
         v
[5. MPC Orchestration] ──> [6. compute_payouts] ──> [7. Concurrency]
                                                          │
                                                          v
                                              [8. Resolver Pool]
                                                          │
                                                          v
                                              [9. Vote Circuit] ──> [10. Finalize Circuit]
                                                                            │
                                                                            v
                                                                   [11. Dispute Orchestration]
```

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **MPC latency per bet** | Sequential lock is fine (low contention) | Batch epoch model needed (30s windows) | Multiple MPC clusters per market, or aggregate bets off-chain and batch-settle |
| **On-chain storage** | Direct PDA accounts | Direct PDA accounts | Consider compression or off-chain encrypted state with on-chain commitments |
| **Indexer load** | Single PostgreSQL instance | Read replicas, caching layer | Dedicated indexing infrastructure (Helius DAS) |
| **MPC cluster cost** | Negligible (few computations/day) | Moderate (optimize circuit complexity) | Significant -- batch aggressively, minimize MPC calls |
| **Solana tx throughput** | No concern | No concern | May need priority fees for callback txs |

---

## Key Architectural Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| MPC latency too high for good UX | HIGH | Design UI around async (fog animations, optimistic updates). Sequential lock for V1. |
| Callback transaction fails | HIGH | Implement retry logic. Arcium docs mention fault handling but specifics need investigation. |
| Pool ciphertext grows stale during concurrent bets | HIGH | Sequential lock (V1) prevents this entirely. Batch model (V2) addresses at scale. |
| Arcium mainnet instability (launched Feb 2026) | MEDIUM | Build and test on devnet first. Have a "plaintext fallback" mode for demo purposes. |
| Circuit design errors reveal private data | CRITICAL | Extensive testing of MPC circuits. Use `Enc<Mxe, T>` for all pool state. Audit before mainnet. |
| 1232-byte output limit per callback | MEDIUM | Design circuits to return minimal data. Pool state is just 2x u64 + nonce = well within limits. |

---

## Sources

### Official Documentation (HIGH confidence)
- [Arcium Architecture Overview](https://docs.arcium.com/getting-started/architecture-overview)
- [Arcium Computation Lifecycle](https://docs.arcium.com/developers/computation-lifecycle)
- [Arcis Types](https://docs.arcium.com/developers/arcis/types)
- [Arcis Operations](https://docs.arcium.com/developers/arcis/operations)
- [Arcis Best Practices](https://docs.arcium.com/developers/arcis/best-practices)
- [Arcis Mental Model](https://docs.arcium.com/developers/arcis/mental-model)
- [Arcis Input/Output](https://docs.arcium.com/developers/arcis/input-output)
- [Arcis Primitives](https://docs.arcium.com/developers/arcis/primitives)
- [Arcium On-Chain Program](https://docs.arcium.com/developers/program)
- [Computation Definition Accounts](https://docs.arcium.com/developers/program/computation-def-accs)
- [Callback Accounts](https://docs.arcium.com/developers/program/callback-accs)
- [Callback Type Generation](https://docs.arcium.com/developers/program/callback-type-generation)
- [Arcium Limitations](https://docs.arcium.com/developers/limitations)
- [MXE Overview](https://docs.arcium.com/multi-party-execution-environments-mxes/overview)
- [MXE Encryption](https://docs.arcium.com/multi-party-execution-environments-mxes/mxe-encryption)
- [Arcium Encryption](https://docs.arcium.com/developers/encryption)
- [Sealing / Re-encryption](https://docs.arcium.com/developers/encryption/sealing)
- [Solana Integration](https://docs.arcium.com/solana-integration-and-multichain-coordination/solana-integration-orchestration-and-execution)
- [Arcium JS Client Library](https://docs.arcium.com/developers/js-client-library)
- [Arcium TS SDK Quick Start](https://ts.arcium.com/docs)
- [Arcium Hello World](https://docs.arcium.com/developers/hello-world)
- [Arcium Examples Repository](https://github.com/arcium-hq/examples)

### Verified Secondary Sources (MEDIUM confidence)
- [Helius: Privacy 2.0 for Solana (Arcium deep dive)](https://www.helius.dev/blog/solana-privacy)
- [Building a Prediction Market on Solana with Anchor](https://dev.to/sivarampg/building-a-prediction-market-on-solana-with-anchor-complete-rust-smart-contract-guide-3pbo)
- [Arcium Mainnet Alpha (Feb 2026)](https://blockeden.xyz/blog/2026/02/12/arcium-mainnet-alpha-encrypted-supercomputer-solana/)
- [Helius: Solana Indexing & WebSockets](https://www.helius.dev/blog/introducing-next-generation-enhanced-websockets)

### Confidence Notes
- **Arcium stateless model:** HIGH -- confirmed by official MXE docs and multiple sources
- **Encrypted state relay pattern:** MEDIUM -- logical derivation from stateless constraint. Confirmed by "Computation Customers can employ external mechanisms to manage data persistence" in docs. Specific implementation (ciphertext in PDA accounts) needs validation with working example.
- **Concurrency model:** LOW -- no existing reference architecture for this pattern in Arcium. The sequential lock is a safe conservative approach. Needs validation during implementation.
- **Circuit code examples:** LOW -- pseudocode based on Arcis type system docs. Actual Arcis syntax may differ. Must be validated against real compilation.
- **MPC latency estimates (2-10s):** LOW -- based on general MPC systems. No Arcium-specific benchmarks found. Needs measurement on testnet.
