# Phase 5: Encrypted Betting - Research

**Researched:** 2026-03-04
**Domain:** Solana program development (Anchor + Arcium MPC), SPL token CPI, encrypted state orchestration
**Confidence:** HIGH

## Summary

Phase 5 wires together the existing `update_pool` MPC infrastructure (built in Phase 3) with a new `place_bet` instruction that transfers USDC and queues encrypted pool updates. The core technical challenge is orchestrating a two-step atomic flow: (1) `place_bet` transfers USDC from user to vault and queues MPC, (2) `update_pool_callback` writes encrypted results back and manages UserPosition.

A critical finding from this research is that **Arcium callbacks cannot create new accounts** -- they can only mutate pre-existing ones. The CONTEXT.md decision to "create UserPosition in update_pool_callback using init_if_needed" must be adapted: the UserPosition PDA should be **pre-initialized in `place_bet`** (where the user is the payer/signer), then the callback only updates its fields. This is the standard Arcium pattern documented in their official callback accounts guide.

The remaining work is well-defined: one new instruction (`place_bet`), modifications to the existing `update_pool_callback` handler, four new Market fields, new error variants, and enabling the `init-if-needed` Cargo feature. The circuit code (`encrypted-ixs/src/lib.rs`) requires **no changes** -- the `update_pool` circuit already handles encrypted pool accumulation and sentiment computation.

**Primary recommendation:** Build `place_bet` as a new instruction that handles USDC transfer + bet validation + lock timeout recovery + UserPosition initialization, then refactor `update_pool_callback` to update the pre-existing UserPosition and handle success/failure flows. The existing `update_pool.rs` queue logic should be **inlined into `place_bet`** rather than called separately.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multiple bets allowed on the same market -- amounts accumulate in UserPosition
- One side only per user per market -- first bet locks the user's side (Yes or No), subsequent bets on the opposite side are rejected
- Single atomic instruction: place_bet transfers USDC to vault and queues MPC in one transaction
- No maximum bet amount -- minimum $1 USDC (1,000,000 lamports), no upper bound
- Reject immediately with MpcLocked error when mpc_lock is active -- no on-chain queue
- Frontend auto-retry with exponential backoff (~2-3s intervals) intended for Phase 7 wiring
- Time-based lock timeout: 60 seconds -- if mpc_lock is older than 60s, treat MPC as failed
- Lock timeout adds a `lock_timestamp: i64` field to Market (set alongside mpc_lock)
- When timeout detected by next place_bet: auto-refund stuck user's USDC, clear lock, then proceed with new bet
- MPC failure callback refunds USDC from vault back to the pending bettor
- Pending bet data stored on Market account: `pending_bettor: Pubkey`, `pending_amount: u64`, `pending_is_yes: bool`
- On failure: callback returns USDC to pending_bettor, clears mpc_lock + pending fields, does NOT update pool or position
- On lock timeout: next place_bet detects stale lock, refunds pending_bettor, then processes new bet
- UserPosition is NOT created/updated until MPC succeeds -- on failure, only USDC refund needed, no position cleanup
- `pending_is_yes` needed for success callback to know which side of UserPosition to update (not needed for refund)
- UserPosition created in update_pool_callback (success path only), not in place_bet
- Callback uses init_if_needed pattern -- creates UserPosition PDA on first successful bet, accumulates on subsequent
- One UserPosition PDA per user per market (seeds: [b"position", market_id, user_pubkey])
- Positions are plaintext (yes_amount, no_amount visible on-chain) -- only aggregate pool totals are encrypted
- Individual bet amounts visible on-chain (UserPosition is plaintext) -- this is intentional
- Core privacy value: hiding AGGREGATE pool totals prevents herding on sentiment
- Encrypting individual positions is deferred (significant MPC complexity, not needed for anti-herding value prop)

### Claude's Discretion
- Exact place_bet instruction account ordering and validation sequence
- Error message wording for bet rejection cases (deadline passed, wrong side, insufficient balance)
- How update_pool_callback creates UserPosition PDA (remaining account passing strategy)
- Lock timeout check implementation details (inline in place_bet vs separate helper)
- Test structure and coverage strategy

### Deferred Ideas (OUT OF SCOPE)
- Encrypting individual positions (UserPosition amounts) -- potential v2 enhancement for stronger individual privacy
- Batched epoch model (SCAL-01) to replace sequential lock for concurrent bets -- v2 optimization
- Bet history/activity log per user -- could be useful for portfolio view (Phase 9)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BET-01 | User can place a Yes or No bet on a binary market with USDC (minimum $1) | `place_bet` instruction with SPL Token transfer CPI; `anchor_spl::token::Transfer` pattern verified; minimum amount validation via `require!(amount >= 1_000_000)` |
| BET-02 | User's bet amount is encrypted via Arcium MPC and added to the encrypted pool | Existing `update_pool` MPC circuit handles encrypted accumulation; `place_bet` queues computation with ArgBuilder carrying encrypted BetInput |
| BET-03 | Pool totals (yes_pool, no_pool) remain encrypted throughout the market lifecycle | MarketPool stores `[u8; 32]` ciphertexts; update_pool circuit returns `Enc<Mxe, PoolTotals>`; no plaintext pool values ever written on-chain |
| BET-04 | User can view encrypted sentiment bucket (Leaning Yes / Even / Leaning No) on live markets | Sentiment u8 written to `Market.sentiment` by callback; already implemented in Phase 3 callback handler |
| BET-05 | Sentiment bucket is computed inside MPC using multiplication-based comparison (no division) | `update_pool` circuit already uses `pool[0] * 2 > total` pattern; no changes needed to circuit code |
| BET-06 | User's position is locked until market resolution (no early exit) | UserPosition has no withdrawal instruction; `claimed` field exists for Phase 6 payout tracking; no exit mechanism built |
| BET-07 | Minimum bet is 1 USDC (1,000,000 token units), no maximum | Validation in `place_bet`: `require!(amount >= 1_000_000, AvenirError::BetTooSmall)` |
| INF-04 | Sequential lock prevents concurrent bet race conditions (one MPC computation at a time per market) | `mpc_lock` boolean + `lock_timestamp` i64 on Market; timeout recovery at 60s; immediate rejection with MpcLocked error |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anchor-lang | 0.32.1 | Solana program framework | Already used throughout codebase |
| anchor-spl | 0.32.1 | SPL Token CPI helpers (Transfer struct, token::transfer) | Official Anchor companion for token operations |
| arcium-anchor | 0.8.5 | MPC integration macros (queue_computation, callback_accounts) | Already used in Phase 3 MPC infrastructure |
| arcium-client | 0.8.5 | Client-side types (CallbackAccount, computation types) | Already used for callback instruction building |
| arcis | 0.8.5 | Encrypted circuit definitions | Already used for update_pool circuit (no changes needed) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| spl-token | 7.0 | Low-level SPL Token types | Already in Cargo.toml; used implicitly by anchor-spl |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `token::transfer` (simple) | `token::transfer_checked` (with decimals/mint) | transfer_checked adds decimals validation but needs Mint account in CPI; since USDC mint is already validated on the vault via `token::mint = usdc_mint` constraint, simple `token::transfer` is sufficient and reduces account count |
| Separate `place_bet` + `queue_update` instructions | Single atomic `place_bet` instruction | User decision: single atomic instruction; reduces failure modes where USDC transfers but MPC never queues |

**Installation:**
No new packages needed. All dependencies already in `programs/avenir/Cargo.toml`. Only change: enable `init-if-needed` feature flag on `anchor-lang`.

```toml
# In programs/avenir/Cargo.toml, change:
anchor-lang = "0.32.1"
# To:
anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
```

## Architecture Patterns

### Recommended Project Structure
```
programs/avenir/src/
├── instructions/
│   ├── place_bet.rs            # NEW: USDC transfer + validation + MPC queue
│   ├── mpc/
│   │   ├── update_pool.rs      # EXISTING: May become unused (logic moves to place_bet)
│   │   ├── update_pool_callback.rs  # MODIFY: Add UserPosition update + failure refund
│   │   └── ...
│   └── mod.rs                  # MODIFY: Add place_bet module
├── state/
│   ├── market.rs               # MODIFY: Add pending_bettor, pending_amount, pending_is_yes, lock_timestamp
│   ├── user_position.rs        # EXISTING: No changes needed
│   └── ...
├── errors.rs                   # MODIFY: Add BetTooSmall, MarketExpired, WrongSide, InsufficientBalance
└── lib.rs                      # MODIFY: Add place_bet entry point
```

### Pattern 1: place_bet as Combined Transfer + Queue Instruction
**What:** A single instruction that validates bet parameters, transfers USDC from user to vault, stores pending bet data on Market, sets the MPC lock, and queues the update_pool computation.
**When to use:** Every bet placement.
**Why:** The user decided on a single atomic instruction. This prevents the state where USDC has been transferred but MPC was never queued.

```rust
// Simplified flow in place_bet handler:
pub fn handler(ctx: Context<PlaceBet>, amount: u64, /* MPC args */) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // 1. Validate bet
    require!(amount >= 1_000_000, AvenirError::BetTooSmall);
    require!(market.state == 0, AvenirError::MarketNotOpen);
    require!(clock.unix_timestamp < market.resolution_time, AvenirError::MarketExpired);

    // 2. Check lock timeout recovery (if lock is stale > 60s)
    if market.mpc_lock {
        if clock.unix_timestamp - market.lock_timestamp > 60 {
            // Refund stuck bettor, clear lock
            refund_pending_bettor(/* ... */)?;
        } else {
            return Err(AvenirError::MpcLocked.into());
        }
    }

    // 3. Side validation (if UserPosition exists, must match side)
    // Check via remaining_accounts or optional account pattern

    // 4. Transfer USDC: user token account -> vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.market_vault.to_account_info(),
        authority: ctx.accounts.bettor.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    token::transfer(cpi_ctx, amount)?;

    // 5. Store pending bet data
    market.pending_bettor = ctx.accounts.bettor.key();
    market.pending_amount = amount;
    market.pending_is_yes = is_yes; // derived from encrypted input direction
    market.mpc_lock = true;
    market.lock_timestamp = clock.unix_timestamp;

    // 6. Queue MPC computation (inline ArgBuilder + queue_computation)
    // ... (same logic as current update_pool.rs)
    Ok(())
}
```

### Pattern 2: Callback with Pre-Existing Account Mutation
**What:** The update_pool_callback receives MPC results and writes to pre-existing accounts only. It updates MarketPool ciphertexts, Market sentiment, and UserPosition amounts.
**When to use:** Every MPC computation completion (success or failure).

**CRITICAL CONSTRAINT:** Arcium callbacks CANNOT create new accounts. The Arcium docs explicitly state: "Cannot create accounts during callback execution (would require nodes to pay)." This means UserPosition must be **pre-initialized before the callback runs**.

**Adaptation from CONTEXT.md decision:** The user decided "UserPosition created in update_pool_callback (success path only)." Since callbacks cannot create accounts, the implementation must adapt:
- **Option A (Recommended):** Pre-create UserPosition in `place_bet` with zero amounts. Callback only updates amounts. This is clean but creates a UserPosition even on MPC failure (cleanup needed).
- **Option B:** Pre-create UserPosition in `place_bet` with `init_if_needed`. On MPC failure, the empty UserPosition remains (harmless -- zero amounts, no economic impact). Callback accumulates amounts on success.
- **Option C:** Use a separate `claim_position` instruction after callback succeeds, requiring the user to submit a second transaction. Adds UX friction.

**Recommendation: Option B.** Pre-create UserPosition in `place_bet` using `init_if_needed`. On first bet, it creates the PDA. On subsequent bets, it skips creation. The callback reads pending data from Market, updates UserPosition amounts on success, and refunds on failure. An empty UserPosition (zero amounts) from a failed MPC has no economic impact and will be properly populated on the next successful bet.

```rust
// In place_bet accounts struct:
#[account(
    init_if_needed,
    payer = bettor,
    space = 8 + UserPosition::INIT_SPACE,
    seeds = [b"position", market.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
    bump,
)]
pub user_position: Account<'info, UserPosition>,
```

```rust
// In update_pool_callback (success path):
// UserPosition PDA is passed as a CallbackAccount (pre-existing, writable)
let position = &mut ctx.accounts.user_position;
if market.pending_is_yes {
    position.yes_amount += market.pending_amount;
} else {
    position.no_amount += market.pending_amount;
}
```

### Pattern 3: Lock Timeout Recovery with Vault Refund
**What:** When `place_bet` detects a stale lock (lock_timestamp > 60s old), it refunds the previous pending bettor's USDC from vault, clears the lock, then proceeds with the new bet.
**When to use:** Timeout recovery path in `place_bet`.

```rust
// Refund requires Market PDA to sign as vault authority:
let market_id = market.id;
let bump = market.bump;
let signer_seeds: &[&[&[u8]]] = &[&[
    b"market",
    &market_id.to_le_bytes(),
    &[bump],
]];

let cpi_accounts = Transfer {
    from: ctx.accounts.market_vault.to_account_info(),
    to: ctx.accounts.pending_bettor_token_account.to_account_info(),
    authority: ctx.accounts.market.to_account_info(),
};
let cpi_ctx = CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    cpi_accounts,
    signer_seeds,
);
token::transfer(cpi_ctx, market.pending_amount)?;
```

**Key detail:** The timeout refund target (previous pending bettor's token account) must be passed to `place_bet` as an account. This account is only used when timeout recovery triggers. It can be validated against `market.pending_bettor` to ensure correctness.

### Pattern 4: Callback Failure Refund
**What:** When MPC fails, the callback refunds USDC from vault back to the pending bettor.
**When to use:** MPC computation failure path in `update_pool_callback`.

**Challenge:** The callback needs to do a token transfer CPI, which requires the Market PDA to sign as vault authority. The callback struct must include the vault token account AND the pending bettor's token account as CallbackAccounts.

```rust
// In update_pool_callback failure path:
Err(e) => {
    msg!("update_pool computation failed: {}", e);
    // Refund: vault -> pending_bettor_token_account
    // Market PDA signs as vault authority using PDA seeds
    let signer_seeds = /* market PDA seeds */;
    let cpi_accounts = Transfer { /* vault -> pending bettor */ };
    token::transfer(CpiContext::new_with_signer(/* ... */))?;
    // Clear lock and pending fields
    market.mpc_lock = false;
    market.pending_bettor = Pubkey::default();
    market.pending_amount = 0;
    market.lock_timestamp = 0;
    return Err(arcium_anchor::ArciumError::AbortedComputation.into());
}
```

**Important:** The callback must have access to `token_program`, `market_vault`, and `pending_bettor_token_account` as additional CallbackAccounts. This increases the callback account count significantly. The `place_bet` instruction must pass all these accounts when building `callback_ixs`.

### Anti-Patterns to Avoid
- **Separate transfer and queue instructions:** User explicitly decided on single atomic instruction. Never split USDC transfer from MPC queue.
- **Creating accounts in callback:** Arcium callbacks cannot create accounts. Pre-create in `place_bet`.
- **Using `transfer_checked` unnecessarily:** Since the vault already validates its mint via `token::mint = usdc_mint` constraint, simple `token::transfer` suffices and avoids needing the Mint account in every CPI context.
- **Storing pending bet data in a separate PDA:** User decided to store `pending_bettor`, `pending_amount`, `pending_is_yes` directly on Market. Avoids extra account creation/lookup.
- **Modifying circuit code:** The `update_pool` circuit already handles everything needed. No changes to `encrypted-ixs/src/lib.rs`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPL Token transfer | Custom token account manipulation | `anchor_spl::token::transfer` with CPI | Token program handles balance checks, overflow, authority validation |
| PDA authority signing | Manual invoke_signed | `CpiContext::new_with_signer` with Anchor's seeds | Anchor handles seed derivation, bump caching |
| Account space calculation | Manual byte counting | `#[derive(InitSpace)]` with `8 + T::INIT_SPACE` | Anchor auto-calculates from struct fields |
| MPC queue orchestration | Custom computation submission | `queue_computation` macro from arcium-anchor | Handles mempool interaction, computation account setup |
| Callback instruction building | Manual instruction construction | `CallbackStruct::callback_ix()` auto-generated method | Handles standard account ordering, serialization |
| Timestamp comparison | Manual syscall | `Clock::get()?.unix_timestamp` | Standard Solana pattern; no Sysvar account needed in Anchor |

**Key insight:** The heavy lifting (encryption, MPC orchestration, callback dispatch) is already built in Phase 3. Phase 5 is primarily plumbing: connecting token transfers to MPC queuing and writing callback results to the right accounts.

## Common Pitfalls

### Pitfall 1: Callback Cannot Create Accounts
**What goes wrong:** Attempting to use `init` or `init_if_needed` in the callback struct. The callback transaction is submitted by Arcium Arx nodes, not the user, so there is no signer/payer for rent.
**Why it happens:** The CONTEXT.md says "Callback uses init_if_needed pattern" which is a natural assumption but incompatible with Arcium's callback model.
**How to avoid:** Pre-create UserPosition in `place_bet` using `init_if_needed`. The callback only mutates the pre-existing account. An empty UserPosition (zero amounts) from a failed MPC is harmless.
**Warning signs:** Callback transaction fails with "insufficient funds for rent" or "account not initialized."

### Pitfall 2: Callback Refund Requires Additional Accounts
**What goes wrong:** The MPC failure path needs to transfer USDC from vault back to the pending bettor, but the callback struct doesn't include the token program, vault, or bettor's token account.
**Why it happens:** The existing `update_pool_callback` struct only has MarketPool and Market as custom accounts. Refund requires vault + token accounts + token program.
**How to avoid:** Pass all refund-required accounts as CallbackAccounts in the `callback_ixs` vector built during `place_bet`. The callback struct must declare all these additional accounts. Count carefully: standard Arcium callback accounts (6) + custom accounts (MarketPool, Market, vault, pending_bettor_token_account, user_position, token_program).
**Warning signs:** Callback refund CPI fails; accounts not available in callback context.

### Pitfall 3: Token Program as CallbackAccount
**What goes wrong:** The callback needs `token_program` for CPI refund, but it's not automatically available in callback context.
**Why it happens:** Arcium callbacks only have accounts explicitly declared in the struct and passed via CallbackAccounts.
**How to avoid:** Include `token_program` (TOKEN_PROGRAM_ID) in the CallbackAccount vector as a non-writable account. Declare it in the callback struct: `pub token_program: Program<'info, Token>`.
**Warning signs:** "Program not found" or "Account not executable" errors in callback.

### Pitfall 4: Side Validation Timing
**What goes wrong:** User places a Yes bet, then before callback completes, places a No bet on the same market. The second bet passes validation because UserPosition hasn't been updated yet.
**Why it happens:** UserPosition is only updated in the callback (async). Between bet placement and callback, the position doesn't reflect the pending bet.
**How to avoid:** Use `pending_is_yes` on Market to validate side consistency. In `place_bet`, if a UserPosition exists with non-zero amounts, check that the new bet matches the existing side. If no position exists but there's a pending bet from the same user, check `pending_is_yes` consistency.
**Warning signs:** User ends up with both yes_amount and no_amount > 0, violating the "one side only" rule.

### Pitfall 5: Lock Timestamp Not Set Atomically with mpc_lock
**What goes wrong:** `mpc_lock` is set to true but `lock_timestamp` is not updated, causing immediate timeout detection on the next bet.
**Why it happens:** Forgetting to set `lock_timestamp = clock.unix_timestamp` alongside `mpc_lock = true`.
**How to avoid:** Always set both fields together in `place_bet`. Include in the same code block with a comment marking them as paired.
**Warning signs:** Every bet triggers timeout recovery, refunding the previous bettor immediately.

### Pitfall 6: Market Account Size Change Breaks Existing Markets
**What goes wrong:** Adding 4 new fields to Market (`pending_bettor: Pubkey`, `pending_amount: u64`, `pending_is_yes: bool`, `lock_timestamp: i64`) increases `Market::INIT_SPACE`. Existing Market accounts on-chain have insufficient space.
**Why it happens:** `#[derive(InitSpace)]` auto-calculates but existing accounts were created with the old size.
**How to avoid:** Since this is pre-launch development with no production markets, this is a non-issue. All testing will create fresh markets with the new size. Document that existing devnet markets (if any) will be incompatible.
**Warning signs:** Anchor deserialization errors when loading old Market accounts.

### Pitfall 7: pending_is_yes Cannot Be Determined from Encrypted Input
**What goes wrong:** The `place_bet` instruction receives `is_yes_ciphertext` (encrypted) but needs to store `pending_is_yes` as plaintext on Market for the callback to know which side to update.
**Why it happens:** The bet direction is encrypted for the MPC circuit, but the on-chain program cannot decrypt it.
**How to avoid:** Accept `is_yes: bool` as a **separate plaintext parameter** to `place_bet`, in addition to the encrypted ciphertext. The plaintext `is_yes` is used for on-chain validation (side checking, pending_is_yes storage). The encrypted `is_yes_ciphertext` is used for the MPC circuit. The user submits both. This does reveal bet direction on-chain, but per the CONTEXT.md decision, individual positions are intentionally plaintext -- only aggregate pools are encrypted.
**Warning signs:** Cannot determine which side to update in callback; cannot validate side consistency in place_bet.

## Code Examples

Verified patterns from the existing codebase and official sources:

### SPL Token Transfer: User to Vault
```rust
// Source: Anchor official docs + cancel_market.rs pattern in this codebase
use anchor_spl::token::{self, Transfer, Token, TokenAccount};

// In handler:
let cpi_accounts = Transfer {
    from: ctx.accounts.user_token_account.to_account_info(),
    to: ctx.accounts.market_vault.to_account_info(),
    authority: ctx.accounts.bettor.to_account_info(),
};
let cpi_ctx = CpiContext::new(
    ctx.accounts.token_program.to_account_info(),
    cpi_accounts,
);
token::transfer(cpi_ctx, amount)?;
```

### SPL Token Refund: Vault to Pending Bettor (PDA-signed)
```rust
// Source: cancel_market.rs pattern (CloseAccount uses same signer_seeds approach)
let market_id = market.id;
let bump = market.bump;
let signer_seeds: &[&[&[u8]]] = &[&[
    b"market",
    &market_id.to_le_bytes(),
    &[bump],
]];

let cpi_accounts = Transfer {
    from: ctx.accounts.market_vault.to_account_info(),
    to: ctx.accounts.pending_bettor_token_account.to_account_info(),
    authority: ctx.accounts.market.to_account_info(),
};
let cpi_ctx = CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    cpi_accounts,
    signer_seeds,
);
token::transfer(cpi_ctx, market.pending_amount)?;
```

### UserPosition init_if_needed in place_bet
```rust
// Source: Anchor docs - init_if_needed constraint
// Requires: anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
#[account(
    init_if_needed,
    payer = bettor,
    space = 8 + UserPosition::INIT_SPACE,
    seeds = [b"position", market.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
    bump,
)]
pub user_position: Account<'info, UserPosition>,
```

### Extended CallbackAccount Vector for Refund Support
```rust
// Source: Arcium docs (callback-accs) + existing update_pool.rs pattern
use arcium_client::idl::arcium::types::CallbackAccount;

let callback_accounts = vec![
    CallbackAccount {
        pubkey: ctx.accounts.market_pool.key(),
        is_writable: true,
    },
    CallbackAccount {
        pubkey: ctx.accounts.market.key(),
        is_writable: true,
    },
    CallbackAccount {
        pubkey: ctx.accounts.user_position.key(),
        is_writable: true,
    },
    CallbackAccount {
        pubkey: ctx.accounts.market_vault.key(),
        is_writable: true,
    },
    CallbackAccount {
        pubkey: ctx.accounts.user_token_account.key(),
        is_writable: true,
    },
    CallbackAccount {
        pubkey: ctx.accounts.token_program.key(),
        is_writable: false,
    },
];
```

### Market Struct with New Fields
```rust
// Added fields for pending bet tracking and lock timeout
#[account]
#[derive(InitSpace)]
pub struct Market {
    // ... existing fields ...
    pub mpc_lock: bool,
    pub lock_timestamp: i64,       // NEW: Unix timestamp when lock was set
    pub pending_bettor: Pubkey,    // NEW: Who placed the pending bet
    pub pending_amount: u64,       // NEW: How much USDC is pending
    pub pending_is_yes: bool,      // NEW: Which side the pending bet is on
    pub bump: u8,
    pub vault_bump: u8,
    pub market_pool_bump: u8,
}
```

### Clock-based Lock Timeout Check
```rust
// Source: Solana docs (Clock sysvar) + RareSkills Solana clock guide
let clock = Clock::get()?;
if market.mpc_lock {
    let elapsed = clock.unix_timestamp - market.lock_timestamp;
    if elapsed > 60 {
        // Lock is stale -- MPC likely failed without callback
        // Refund pending bettor and clear lock
        refund_pending_bettor(/* ... */)?;
        market.mpc_lock = false;
        market.pending_bettor = Pubkey::default();
        market.pending_amount = 0;
        market.lock_timestamp = 0;
    } else {
        return Err(AvenirError::MpcLocked.into());
    }
}
```

### Callback Success Path with UserPosition Update
```rust
// In update_pool_callback handler (success path):
let result = output.verify_output(
    &ctx.accounts.cluster_account,
    &ctx.accounts.computation_account,
)?;

// Write updated pool ciphertexts
let market_pool = &mut ctx.accounts.market_pool;
market_pool.yes_pool_encrypted = result.field_0.ciphertexts[0];
market_pool.no_pool_encrypted = result.field_0.ciphertexts[1];
market_pool.nonce = result.field_0.nonce;

// Write sentiment
let market = &mut ctx.accounts.market;
market.sentiment = result.field_1;

// Update UserPosition (pre-created in place_bet)
let position = &mut ctx.accounts.user_position;
if position.market_id == 0 {
    // First bet -- initialize fields
    position.market_id = market.id;
    position.user = market.pending_bettor;
}
if market.pending_is_yes {
    position.yes_amount += market.pending_amount;
} else {
    position.no_amount += market.pending_amount;
}

// Clear pending state and release lock
market.mpc_lock = false;
market.pending_bettor = Pubkey::default();
market.pending_amount = 0;
market.lock_timestamp = 0;
market.total_bets += 1;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `token::transfer` (3 accounts) | `token::transfer_checked` (4 accounts, with decimals) | SPL Token 2022 / Token Extensions | `transfer_checked` is preferred for new projects but standard `transfer` still works and is simpler for known-mint scenarios like USDC |
| Sysvar account for Clock | `Clock::get()` syscall | Solana 1.8+ | No need to pass Clock as account; reduces instruction account count |
| Manual space calculation | `#[derive(InitSpace)]` | Anchor 0.29+ | Auto-calculates space from struct fields; less error-prone |
| `init` only | `init_if_needed` feature flag | Anchor 0.24+ | Enables idempotent account creation; requires explicit feature flag for safety |

**Deprecated/outdated:**
- None relevant to this phase. All patterns used are current Anchor 0.32.1 standard.

## Open Questions

1. **Callback CPI for refund -- does Arcium allow CPI from callbacks?**
   - What we know: Arcium callbacks can mutate accounts. The callback is a regular Solana instruction executed by Arx nodes.
   - What's unclear: Whether a CPI to the Token Program from within a callback instruction is supported. There's no explicit documentation saying callbacks cannot do CPI. Since callbacks are regular Solana instructions, CPI should work -- but this needs validation.
   - Recommendation: Assume CPI works (it's standard Solana). If validation reveals it doesn't, fallback to storing a "refund_pending" flag on Market and adding a separate `claim_refund` instruction the user calls.

2. **Pending bettor token account in timeout recovery**
   - What we know: When `place_bet` detects a stale lock, it needs to refund the previous bettor's USDC. This requires the previous bettor's token account.
   - What's unclear: The new bettor must pass the old bettor's token account. How do they know which account to pass? The `pending_bettor` pubkey is on-chain, but the associated token account must be derived.
   - Recommendation: Use Solana's `get_associated_token_address(pending_bettor, usdc_mint)` to derive it. The frontend can read `market.pending_bettor` and derive the ATA. On-chain, validate that the passed account matches the expected ATA.

3. **Side validation for pending bets from the same user**
   - What we know: If user A places a Yes bet, the MPC lock is set. If user A tries to place a No bet before callback, the MPC lock rejects them. But if user A tries a same-side bet, it also gets rejected by the lock.
   - What's unclear: Is this acceptable UX? The user can never place a second bet while their first is processing.
   - Recommendation: This is acceptable for v1. The lock timeout is 60s max, and frontend auto-retry (Phase 7) handles the UX. Document this as expected behavior.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `programs/avenir/src/instructions/mpc/update_pool.rs` - Queue computation pattern with ArgBuilder
- Existing codebase: `programs/avenir/src/instructions/mpc/update_pool_callback.rs` - Callback struct pattern
- Existing codebase: `programs/avenir/src/instructions/cancel_market.rs` - SPL Token CPI with PDA signer_seeds
- Existing codebase: `encrypted-ixs/src/lib.rs` - update_pool circuit (no changes needed)
- [Arcium Callback Accounts Docs](https://docs.arcium.com/developers/program/callback-accs) - Cannot create accounts in callback; callback_ix() helper pattern; account ordering requirements
- [Anchor Transfer Tokens Docs](https://www.anchor-lang.com/docs/tokens/basics/transfer-tokens) - CpiContext::new_with_signer for PDA authority

### Secondary (MEDIUM confidence)
- [RareSkills - SPL Token Transfer](https://rareskills.io/post/spl-token-transfer) - Transfer vs TransferChecked patterns verified against Anchor docs
- [RareSkills - init_if_needed](https://rareskills.io/post/init-if-needed-anchor) - Feature flag requirement and reinitialization attack prevention
- [Anchor Account Constraints](https://www.anchor-lang.com/docs/references/account-constraints) - init_if_needed constraint documentation
- [Solana Clock Sysvar](https://rareskills.io/post/solana-clock) - Clock::get()?.unix_timestamp for lock timeout

### Tertiary (LOW confidence)
- Callback CPI capability -- inferred from Solana's general CPI model but not explicitly documented for Arcium callbacks. Needs validation during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use; no new dependencies
- Architecture: HIGH - Patterns derived from existing codebase (Phase 3) + verified Arcium/Anchor docs
- Pitfalls: HIGH - Critical callback limitation verified against official Arcium docs; other pitfalls from codebase analysis
- UserPosition creation strategy: MEDIUM - Adapted from user decision due to Arcium callback constraint; init_if_needed in place_bet is sound but diverges from original intent
- Callback CPI for refund: MEDIUM - Standard Solana CPI should work but no explicit Arcium documentation confirms it

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- Anchor 0.32.1 and Arcium 0.8.5 are pinned versions)
