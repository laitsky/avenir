---
phase: 03-arcium-mpc-core
plan: 02a
type: execute
wave: 2
depends_on: [03-01]
files_modified:
  - encrypted-ixs/src/lib.rs
  - programs/avenir/src/state/market.rs
  - programs/avenir/src/state/market_pool.rs
  - programs/avenir/src/state/mod.rs
autonomous: true
requirements: [INF-02]

must_haves:
  truths:
    - "update_pool circuit compiles with arcis and includes sentiment bucket computation using multiplication-based comparison"
    - "MarketPool PDA with fixed-layout fields stores encrypted pool ciphertext and nonce at deterministic byte offsets"
    - "update_pool circuit takes an encrypted bet input (Shared) and existing pool state (Mxe) and returns updated pool + sentiment"
    - "Market struct encrypted fields moved to MarketPool; sentiment, mpc_lock, total_bets remain on Market"
  artifacts:
    - path: "encrypted-ixs/src/lib.rs"
      provides: "update_pool circuit with PoolTotals, BetInput types and sentiment logic"
      contains: "pub fn update_pool"
    - path: "programs/avenir/src/state/market_pool.rs"
      provides: "MarketPool PDA with fixed-layout encrypted fields for ArgBuilder.account() compatibility"
      contains: "pub struct MarketPool"
    - path: "programs/avenir/src/state/market.rs"
      provides: "Market struct with encrypted fields removed (moved to MarketPool)"
      contains: "pub struct Market"
  key_links:
    - from: "programs/avenir/src/state/market_pool.rs"
      to: "encrypted-ixs/src/lib.rs"
      via: "MarketPool field layout matches PoolTotals ciphertext output from MPC (2 x [u8;32])"
      pattern: "yes_pool_encrypted|no_pool_encrypted"
---

<objective>
Create the MarketPool PDA for fixed-layout encrypted state storage and implement the update_pool MPC circuit with full-fidelity pool types and sentiment bucket logic.

Purpose: The MarketPool PDA solves the variable byte offset problem (Market has variable-length Strings that make ArgBuilder.account() offsets non-deterministic) by providing a fixed-layout target for MPC reads/writes. The update_pool circuit is the core computation that accumulates encrypted bets and computes sentiment buckets.
Output: Compilable update_pool circuit, MarketPool PDA state account, updated Market struct.
</objective>

<execution_context>
@/Users/laitsky/.claude/get-shit-done/workflows/execute-plan.md
@/Users/laitsky/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-arcium-mpc-core/03-RESEARCH.md
@.planning/phases/03-arcium-mpc-core/03-01-SUMMARY.md

<interfaces>
<!-- Key types and contracts from Phase 1/2 + Plan 03-01 that executor needs. -->

From programs/avenir/src/state/market.rs:
```rust
#[account]
#[derive(InitSpace)]
pub struct Market {
    pub id: u64,
    #[max_len(200)]
    pub question: String,
    #[max_len(128)]
    pub resolution_source: String,
    pub category: u8,
    pub resolution_time: i64,
    pub state: u8,
    pub winning_outcome: u8,
    pub yes_pool_encrypted: [u8; 32],     // Will move to MarketPool
    pub no_pool_encrypted: [u8; 32],      // Will move to MarketPool
    pub sentiment: u8,                    // Stays on Market (plaintext)
    pub total_bets: u64,
    pub creator: Pubkey,
    pub created_at: i64,
    pub config_fee_recipient: Pubkey,
    pub config_fee_bps: u16,
    pub mpc_lock: bool,                   // Stays on Market
    pub bump: u8,
    pub vault_bump: u8,
}
```

From encrypted-ixs/src/lib.rs (after 03-01):
```rust
use arcis::*;
#[encrypted]
mod circuits {
    use arcis::*;
    pub type PoolTotals = [u64; 2];
    #[instruction]
    pub fn init_pool(mxe: Mxe) -> Enc<Mxe, PoolTotals> { ... }
    #[instruction]
    pub fn hello_world(a_ctxt: Enc<Shared, u64>, b_ctxt: Enc<Shared, u64>) -> Enc<Mxe, u64> { ... }
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create MarketPool PDA and update Market struct</name>
  <files>
    programs/avenir/src/state/market_pool.rs,
    programs/avenir/src/state/market.rs,
    programs/avenir/src/state/mod.rs
  </files>
  <action>
**Step 1: Create MarketPool PDA account**
Create `programs/avenir/src/state/market_pool.rs` with a fixed-layout account for encrypted pool state:

```rust
#[account]
#[derive(InitSpace)]
pub struct MarketPool {
    /// Market ID this pool belongs to
    pub market_id: u64,
    /// Encrypted Yes pool ciphertext (Arcium MXE-owned)
    pub yes_pool_encrypted: [u8; 32],
    /// Encrypted No pool ciphertext (Arcium MXE-owned)
    pub no_pool_encrypted: [u8; 32],
    /// Arcium nonce for MXE ciphertext (required for decryption in subsequent MPC calls)
    pub nonce: u128,
    /// PDA bump seed
    pub bump: u8,
}
```

PDA seeds: `[b"market_pool", market_id.to_le_bytes()]`

**Why MarketPool instead of keeping encrypted fields on Market:**
The Market struct has variable-length String fields (question: max 200, resolution_source: max 128). Anchor serializes Strings with a 4-byte length prefix + variable content. `ArgBuilder.account()` reads ciphertext at a fixed byte offset -- with variable-length strings, the offset changes per market instance. MarketPool has ONLY fixed-size fields, so the byte offset to `yes_pool_encrypted` is always: 8 (discriminator) + 8 (market_id) = 16 bytes. This is deterministic.

This deviation from the original CONTEXT.md decision ("keep encrypted state on Market account") has been approved -- see revised CONTEXT.md ciphertext storage format decision.

**Step 2: Update Market struct**
Remove `yes_pool_encrypted` and `no_pool_encrypted` from `programs/avenir/src/state/market.rs` since they move to MarketPool. Keep `sentiment`, `mpc_lock`, `total_bets` on Market (these are plaintext). Add `market_pool_bump: u8` to Market so it can derive the MarketPool PDA.

NOTE: This is a breaking change for any existing tests that reference these fields. The Phase 2 tests for create_market and cancel_market should still pass since they don't use encrypted pool fields.

**Step 3: Update state/mod.rs**
Add `pub mod market_pool;` and re-export.
  </action>
  <verify>
    <automated>cd /Users/laitsky/Developments/avenir && grep -q "pub struct MarketPool" programs/avenir/src/state/market_pool.rs && grep -q "market_pool" programs/avenir/src/state/mod.rs && echo "MarketPool PDA created"</automated>
  </verify>
  <done>
    MarketPool PDA created with fixed-layout fields (market_id, yes_pool_encrypted, no_pool_encrypted, nonce, bump). Market struct updated (encrypted fields removed, market_pool_bump added). state/mod.rs exports MarketPool.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write update_pool circuit with sentiment logic</name>
  <files>
    encrypted-ixs/src/lib.rs
  </files>
  <action>
Update `encrypted-ixs/src/lib.rs` -- keep `init_pool` and `hello_world`, add `update_pool` with full-fidelity types:

```rust
/// Bet input from user -- encrypted with user's shared secret
pub struct BetInput {
    pub is_yes: bool,
    pub amount: u64,
}

/// Update encrypted pool totals with a new bet and compute sentiment bucket.
///
/// Sentiment uses multiplication-based comparison (not division, per BET-05):
/// - yes_pool * 2 > total  =>  Leaning Yes (1)
/// - no_pool * 2 > total   =>  Leaning No (3)
/// - otherwise              =>  Even (2)
///
/// Returns: (updated pool totals as Mxe, sentiment value revealed as plaintext u8)
#[instruction]
pub fn update_pool(
    bet_ctxt: Enc<Shared, BetInput>,
    pool_ctxt: Enc<Mxe, PoolTotals>,
) -> (Enc<Mxe, PoolTotals>, u8) {
    let bet = bet_ctxt.to_arcis();
    let mut pool = pool_ctxt.to_arcis();

    // Update pool totals
    if bet.is_yes {
        pool[0] += bet.amount;  // yes_pool
    } else {
        pool[1] += bet.amount;  // no_pool
    }

    // Compute sentiment bucket using multiplication (no division)
    let total = pool[0] + pool[1];
    let sentiment: u8 = if pool[0] * 2 > total {
        1  // Leaning Yes
    } else if pool[1] * 2 > total {
        3  // Leaning No
    } else {
        2  // Even
    };

    // Return updated pool as MXE-encrypted, sentiment as revealed plaintext
    (pool_ctxt.owner.from_arcis(pool), sentiment.reveal())
}
```

NOTE: The `sentiment.reveal()` call makes the sentiment value plaintext in the circuit output. This is intentional -- sentiment is meant to be visible on-chain (Market.sentiment field). If `.reveal()` is not supported for the return type, wrap sentiment in a struct and return it encrypted, then have the callback extract it differently. Test during implementation.

NOTE: The `if` conditionals with `bet.is_yes` involve comparison on encrypted booleans, and the sentiment comparisons involve comparison on encrypted u64 values. These are the expensive MPC operations per Pitfall 4 from research. The circuit uses exactly 3 comparisons (1 for is_yes branch + 2 for sentiment), which is acceptable.

**Verify circuit compiles:**
Run `arcium build` and confirm `update_pool` circuit compiles alongside `init_pool` and `hello_world`.
  </action>
  <verify>
    <automated>cd /Users/laitsky/Developments/avenir && arcium build 2>&1 | grep -E "update_pool|init_pool|hello_world"</automated>
  </verify>
  <done>
    update_pool circuit compiles with full PoolTotals, BetInput types and multiplication-based sentiment computation. Circuit uses 3 comparisons total (1 bool branch + 2 sentiment buckets).
  </done>
</task>

</tasks>

<verification>
1. MarketPool PDA exists with fixed-layout fields (market_id u64, yes_pool_encrypted [u8;32], no_pool_encrypted [u8;32], nonce u128, bump u8)
2. Market struct no longer has yes_pool_encrypted/no_pool_encrypted fields (moved to MarketPool)
3. Market struct has new market_pool_bump field
4. state/mod.rs exports market_pool module
5. update_pool circuit includes BetInput struct and sentiment bucket computation with multiplication-based comparison
6. `arcium build` compiles all 3 circuits (init_pool, hello_world, update_pool) without errors
</verification>

<success_criteria>
- MarketPool PDA provides fixed-layout target for ArgBuilder.account() at deterministic byte offset (16)
- update_pool circuit compiles with full PoolTotals/BetInput types and multiplication-based sentiment logic
- Market struct cleanly separated: encrypted state on MarketPool, plaintext state on Market
- `arcium build` succeeds with all circuits
</success_criteria>

<output>
After completion, create `.planning/phases/03-arcium-mpc-core/03-02a-SUMMARY.md`
</output>
