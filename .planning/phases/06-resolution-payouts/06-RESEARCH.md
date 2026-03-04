# Phase 6: Resolution & Payouts - Research

**Researched:** 2026-03-04
**Domain:** Solana program development (Anchor + Arcium MPC), SPL Token CPI, parimutuel payout math, encrypted state reveal
**Confidence:** HIGH

## Summary

Phase 6 implements the resolution and payout lifecycle for prediction markets. It adds three new on-chain instructions (`resolve_market`, `compute_payouts`, `claim_payout`), one MPC callback (`compute_payouts_callback`), one new MPC circuit (`compute_payouts`), and a new computation definition registration instruction (`init_compute_payouts_comp_def`). The phase also extends the Market state with two new fields (`revealed_yes_pool`, `revealed_no_pool`) and a new state value (`Finalized = 4`), and adds five new error variants.

The core technical flow is a three-step process: (1) the market creator calls `resolve_market` to declare the winning outcome after the deadline passes, which sets `Market.state = Resolved(2)` and `Market.winning_outcome`; (2) anyone calls `compute_payouts` to trigger the MPC circuit that decrypts the pool totals, with the callback writing revealed plaintext values to Market and setting `state = Finalized(4)`; (3) each winning bettor calls `claim_payout` to receive their proportional share of the total pool minus a 2% protocol fee.

The implementation closely follows established patterns from Phase 5. The `compute_payouts` circuit is simpler than `update_pool` -- it takes `Enc<Mxe, PoolTotals>` as input and returns `(u64, u64)` where both values are `.reveal()`'d to plaintext. The `claim_payout` instruction is a pure on-chain SPL Token transfer with no MPC involvement, using the revealed pool totals for proportional math. All payout calculation happens in plaintext after the MPC reveal, per RES-09.

**Primary recommendation:** Follow the established MPC instruction pattern (comp_def registration, queue_computation, callback) for `compute_payouts`. Build `resolve_market` as a simple state-transition instruction with creator validation. Build `claim_payout` as a standalone token transfer instruction with proportional payout math using checked arithmetic.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-step process: resolve_market (creator declares winner) then compute_payouts (anyone triggers MPC reveal)
- resolve_market sets Market.state = Resolved (2) and Market.winning_outcome (1=Yes, 2=No)
- compute_payouts is permissionless -- any account can trigger it on a Resolved market
- resolve_market checks mpc_lock -- rejects if a bet is in-flight (market must be quiescent)
- Creator can resolve anytime after resolution_time (deadline). No upper time limit in Phase 6 -- the 48h grace period and dispute escalation are Phase 8's concern
- Pull model: each winner calls claim_payout individually
- claim_payout requires compute_payouts to have completed (state = Finalized)
- 2% protocol fee (200 basis points) deducted per-winner from each claim_payout
- Fee sent to config_fee_recipient (snapshotted on Market at creation) during each claim
- UserPosition.claimed set to true after successful claim -- prevents double-claim
- compute_payouts MPC circuit takes encrypted PoolTotals, returns plaintext [yes_pool, no_pool] -- minimal MPC complexity
- Revealed totals stored as new fields on Market: revealed_yes_pool (u64), revealed_no_pool (u64)
- Reuse existing mpc_lock for compute_payouts -- same lock/unlock pattern as update_pool
- New Market.state value: Finalized (4) -- set by compute_payouts_callback after writing revealed pools
- State flow: Open (0) -> Resolved (2) -> Finalized (4). Claims only accepted at Finalized (4)
- All bets on winning side (losing_pool = 0): winners get original bet back minus 2% fee
- Rounding: floor individual payouts, dust stays in market vault (immaterial amounts)
- Losers: explicit rejection with NoWinningPosition error when calling claim_payout
- No claim expiry: winners can claim indefinitely after finalization. No sweep/recovery logic for v1
- Payout formula: `user_payout = (user_winning_amount * total_pool / winning_pool) - fee`
- total_pool = revealed_yes_pool + revealed_no_pool
- winning_pool = revealed_yes_pool if winning_outcome=Yes, else revealed_no_pool
- Fee = user_payout * config_fee_bps / 10000
- resolve_market only validates: caller is market creator, state is Open, deadline has passed, mpc_lock is false

### Claude's Discretion
- compute_payouts circuit implementation details (input/output types, Arcis patterns)
- compute_payouts_callback account struct ordering
- Exact payout formula implementation (proportional share math)
- Error message wording for resolution/claim rejection cases
- Test structure and coverage strategy
- Whether resolve_market needs a separate state transition (e.g., Locked=1) before Resolved=2

### Deferred Ideas (OUT OF SCOPE)
- Claim expiry with unclaimed fund recovery (sweep to protocol) -- potential v2 enhancement
- Batch payout distribution (push model) -- not feasible on Solana for v1 due to account limits
- Per-user payout computation inside MPC -- overkill, RES-09 specifies plaintext math after reveal
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RES-01 | Market creator can resolve the market by declaring the winning outcome | `resolve_market` instruction validates `caller == market.creator`, checks `market.state == 0` (Open), verifies `clock.unix_timestamp >= market.resolution_time`, and sets `Market.winning_outcome` + `Market.state = 2` (Resolved) |
| RES-02 | Resolution has a 48-hour grace period after market deadline | Phase 6 implements the `resolution_time` check (creator can resolve after deadline). The 48-hour upper limit and dispute escalation are Phase 8's concern per CONTEXT.md. Phase 6 enforces "after deadline, no upper limit" |
| RES-07 | Winners receive instant USDC payout proportional to their share of the winning pool | `claim_payout` instruction computes `user_payout = (user_winning_amount * total_pool / winning_pool) - fee` and transfers USDC from vault to winner via SPL Token CPI with Market PDA as signer |
| RES-08 | Protocol fee of 1-2% is deducted from winning payouts | `claim_payout` deducts `fee = gross_payout * config_fee_bps / 10000` (config_fee_bps = 200 = 2%). Fee transferred to `config_fee_recipient` (snapshotted on Market at creation). Net payout = gross - fee |
| RES-09 | Payout calculation uses plaintext math after pool totals are revealed at resolution | `compute_payouts` MPC circuit reveals encrypted pool totals as plaintext `(u64, u64)` written to `Market.revealed_yes_pool` and `Market.revealed_no_pool`. All payout math in `claim_payout` uses these plaintext values -- no MPC involvement in individual payouts |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anchor-lang | 0.32.1 | Solana program framework with account validation, PDA derivation | Already used throughout codebase |
| anchor-spl | 0.32.1 | SPL Token CPI helpers (Transfer struct, token::transfer) | Already used in place_bet and update_pool_callback for token transfers |
| arcium-anchor | 0.8.5 | MPC integration macros (queue_computation, callback_accounts, init_computation_definition_accounts) | Already used in Phase 3/5 MPC infrastructure |
| arcium-client | 0.8.5 | Client-side types (CallbackAccount) for callback instruction building | Already used for callback account vectors |
| arcis | 0.8.5 | Encrypted circuit definitions with `#[instruction]`, `Enc<Mxe, T>`, `.reveal()` | Already used for update_pool circuit |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| spl-token | 7.0 | Low-level SPL Token types | Already in Cargo.toml; used implicitly by anchor-spl |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two separate transfers in claim_payout (fee + payout) | Single transfer with fee deducted off-chain | On-chain fee transfer to config_fee_recipient is mandatory per CONTEXT.md; two CPIs required |
| Revealing (yes_pool, no_pool) separately | Revealing (winning_pool, total_pool) | CONTEXT.md locks [yes_pool, no_pool] reveal; reveals more info but simplifies callback (no need to pass winning_outcome into circuit) |
| resolve_market as Locked(1) then Resolved(2) | Direct Open(0) to Resolved(2) | Single transition is simpler; Locked(1) state exists in Market struct but is unused in Phase 6. No benefit to intermediate state since resolve_market is a single synchronous instruction |

**Installation:**
No new packages needed. All dependencies already in `programs/avenir/Cargo.toml` and `encrypted-ixs/Cargo.toml`.

## Architecture Patterns

### Recommended Project Structure
```
programs/avenir/src/
├── instructions/
│   ├── resolve_market.rs                      # NEW: Creator declares winning outcome
│   ├── claim_payout.rs                        # NEW: Winner claims proportional USDC payout
│   ├── mpc/
│   │   ├── init_compute_payouts_comp_def.rs   # NEW: Register compute_payouts circuit
│   │   ├── compute_payouts.rs                 # NEW: Queue compute_payouts MPC (permissionless)
│   │   ├── compute_payouts_callback.rs        # NEW: Write revealed pool totals to Market
│   │   ├── update_pool.rs                     # EXISTING: Unchanged
│   │   ├── update_pool_callback.rs            # EXISTING: Unchanged
│   │   └── mod.rs                             # MODIFY: Add 3 new modules
│   ├── mod.rs                                 # MODIFY: Add resolve_market, claim_payout
│   └── ...
├── state/
│   ├── market.rs                              # MODIFY: Add revealed_yes_pool, revealed_no_pool
│   └── ...
├── errors.rs                                  # MODIFY: Add 5 new error variants
└── lib.rs                                     # MODIFY: Add 5 new entry points
encrypted-ixs/src/
└── lib.rs                                     # MODIFY: Add compute_payouts circuit
```

### Pattern 1: resolve_market -- Simple State Transition
**What:** A synchronous instruction that validates the caller is the market creator, the market is in Open state, the deadline has passed, and no MPC operation is in flight. Sets Market.state to Resolved(2) and Market.winning_outcome.
**When to use:** When market creator declares the winning outcome.

```rust
// Source: Existing codebase patterns (create_market.rs for creator validation)
pub fn handler(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Validate caller is market creator
    require!(
        ctx.accounts.creator.key() == market.creator,
        AvenirError::NotMarketCreator
    );

    // Validate market state is Open
    require!(market.state == 0, AvenirError::MarketNotOpen);

    // Validate deadline has passed
    require!(
        clock.unix_timestamp >= market.resolution_time,
        AvenirError::MarketNotExpired
    );

    // Validate no MPC in flight
    require!(!market.mpc_lock, AvenirError::MpcLocked);

    // Validate winning outcome (1=Yes, 2=No)
    require!(
        winning_outcome == 1 || winning_outcome == 2,
        AvenirError::InvalidOutcome
    );

    // Set resolution state
    market.state = 2; // Resolved
    market.winning_outcome = winning_outcome;

    Ok(())
}
```

**Account struct:**
```rust
#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.creator == creator.key() @ AvenirError::NotMarketCreator,
    )]
    pub market: Account<'info, Market>,
}
```

**Design decision:** resolve_market does NOT need a separate Locked(1) state before Resolved(2). The instruction is synchronous -- it validates and transitions atomically. The mpc_lock check ensures no bet is in-flight. Going directly from Open(0) to Resolved(2) is cleaner and matches the CONTEXT.md state flow.

### Pattern 2: compute_payouts MPC Circuit
**What:** An Arcis circuit that takes the encrypted `PoolTotals` (`Enc<Mxe, PoolTotals>`) and reveals both pool values as plaintext `(u64, u64)`.
**When to use:** Once per market, after resolution, before claims.

```rust
// Source: Existing update_pool circuit pattern + ARCHITECTURE.md compute_payouts design
// In encrypted-ixs/src/lib.rs
#[instruction]
pub fn compute_payouts(
    pool_ctxt: Enc<Mxe, PoolTotals>,
) -> (u64, u64) {
    let pool = pool_ctxt.to_arcis();
    // Reveal both pool totals -- resolution ends privacy
    (pool[0].reveal(), pool[1].reveal())
}
```

**Key observations:**
- The circuit takes ONLY `Enc<Mxe, PoolTotals>` -- no user-encrypted input (no `Enc<Shared, ...>`). This means no x25519 keypair, no shared secret, no nonce. The ArgBuilder only needs `.account()` for the MarketPool ciphertext read.
- The circuit returns `(u64, u64)` with both values `.reveal()`'d -- both become plaintext in the output.
- This is simpler than `update_pool` which takes both shared-encrypted user input and MXE-encrypted pool state.
- No `winning_outcome` parameter needed in the circuit -- both pools are revealed, and the on-chain program selects the winning pool based on `market.winning_outcome`.

**Output type prediction:** Following the pattern from `update_pool` where `(Enc<Mxe, PoolTotals>, u8)` produces `UpdatePoolOutput { field_0: UpdatePoolOutputStruct0 { field_0: MXEEncryptedStruct<2>, field_1: u8 } }`, the `(u64, u64)` return from `compute_payouts` should produce something like `ComputePayoutsOutput { field_0: ComputePayoutsOutputStruct0 { field_0: u64, field_1: u64 } }`. The revealed u64 values appear as plain u64 in the output struct (same as the u8 sentiment in update_pool). **Confidence: MEDIUM** -- exact output struct naming and nesting depends on Arcium macro code generation. Must verify during implementation by checking the generated types.

### Pattern 3: compute_payouts Queue + Callback
**What:** The queue instruction reads encrypted pool state from MarketPool and submits it to MPC. The callback writes revealed values to Market and sets state to Finalized(4).
**When to use:** After resolve_market, before claim_payout.

**Queue instruction (compute_payouts.rs):**
```rust
pub fn handler(ctx: Context<ComputePayouts>, computation_offset: u64) -> Result<()> {
    // Validate market is Resolved
    require!(ctx.accounts.market.state == 2, AvenirError::MarketNotResolved);

    // Check mpc_lock
    require!(!ctx.accounts.market.mpc_lock, AvenirError::MpcLocked);

    // Set mpc_lock
    ctx.accounts.market.mpc_lock = true;
    ctx.accounts.market.lock_timestamp = Clock::get()?.unix_timestamp;

    // ArgBuilder: only account read from MarketPool (no user-encrypted input)
    let args = ArgBuilder::new()
        .account(
            ctx.accounts.market_pool.key(),
            16, // offset: 8 (discriminator) + 8 (market_id)
            64, // length: 32 (yes_pool) + 32 (no_pool)
        )
        .build();

    // Callback with Market account (to write revealed values)
    let callback_accounts = vec![
        CallbackAccount {
            pubkey: ctx.accounts.market.key(),
            is_writable: true,
        },
    ];

    let callback_ixs = vec![ComputePayoutsCallback::callback_ix(
        computation_offset,
        &ctx.accounts.mxe_account,
        &callback_accounts,
    )?];

    queue_computation(ctx.accounts, computation_offset, args, callback_ixs, 1, 0)?;
    Ok(())
}
```

**Callback instruction (compute_payouts_callback.rs):**
```rust
pub fn handler(
    ctx: Context<ComputePayoutsCallback>,
    output: SignedComputationOutputs<ComputePayoutsOutput>,
) -> Result<()> {
    let result = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(ComputePayoutsOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("compute_payouts computation failed: {}", e);
            let market = &mut ctx.accounts.market;
            market.mpc_lock = false;
            market.lock_timestamp = 0;
            return Err(arcium_anchor::ArciumError::AbortedComputation.into());
        }
    };

    // Write revealed pool totals to Market
    let market = &mut ctx.accounts.market;
    market.revealed_yes_pool = result.field_0; // u64
    market.revealed_no_pool = result.field_1;  // u64
    market.state = 4; // Finalized
    market.mpc_lock = false;
    market.lock_timestamp = 0;

    msg!(
        "compute_payouts complete - revealed_yes_pool={}, revealed_no_pool={}, state=Finalized",
        market.revealed_yes_pool,
        market.revealed_no_pool,
    );
    Ok(())
}
```

**Callback account struct is simpler than update_pool_callback** -- it only needs the Market account as a custom callback account (no token transfers, no UserPosition updates). On failure, the callback just clears mpc_lock -- no refund needed since compute_payouts does not hold any user funds.

### Pattern 4: claim_payout -- Proportional USDC Distribution
**What:** A pure on-chain instruction (no MPC) that computes the winner's proportional share, deducts the protocol fee, and transfers net payout from vault to winner and fee to fee_recipient.
**When to use:** Each winner calls this individually after market is Finalized(4).

```rust
pub fn handler(ctx: Context<ClaimPayout>) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &ctx.accounts.user_position;

    // 1. Validate market is Finalized
    require!(market.state == 4, AvenirError::MarketNotFinalized);

    // 2. Validate not already claimed
    require!(!position.claimed, AvenirError::AlreadyClaimed);

    // 3. Determine user's winning amount
    let user_winning_amount = if market.winning_outcome == 1 {
        position.yes_amount // Yes won
    } else {
        position.no_amount  // No won
    };

    // 4. Reject losers
    require!(user_winning_amount > 0, AvenirError::NoWinningPosition);

    // 5. Compute payout
    let total_pool = market.revealed_yes_pool
        .checked_add(market.revealed_no_pool)
        .unwrap();
    let winning_pool = if market.winning_outcome == 1 {
        market.revealed_yes_pool
    } else {
        market.revealed_no_pool
    };

    // gross_payout = user_winning_amount * total_pool / winning_pool
    // Use u128 intermediate to prevent overflow
    let gross_payout = (user_winning_amount as u128)
        .checked_mul(total_pool as u128)
        .unwrap()
        .checked_div(winning_pool as u128)
        .unwrap() as u64;

    // fee = gross_payout * fee_bps / 10000
    let fee = (gross_payout as u128)
        .checked_mul(market.config_fee_bps as u128)
        .unwrap()
        .checked_div(10_000)
        .unwrap() as u64;

    let net_payout = gross_payout.checked_sub(fee).unwrap();

    // 6. Transfer net payout: vault -> winner
    let market_id = market.id;
    let bump = market.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"market",
        &market_id.to_le_bytes(),
        &[bump],
    ]];

    // Transfer payout
    let payout_accounts = Transfer {
        from: ctx.accounts.market_vault.to_account_info(),
        to: ctx.accounts.winner_token_account.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            payout_accounts,
            signer_seeds,
        ),
        net_payout,
    )?;

    // 7. Transfer fee: vault -> fee_recipient
    if fee > 0 {
        let fee_accounts = Transfer {
            from: ctx.accounts.market_vault.to_account_info(),
            to: ctx.accounts.fee_recipient_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                fee_accounts,
                signer_seeds,
            ),
            fee,
        )?;
    }

    // 8. Mark as claimed
    let position = &mut ctx.accounts.user_position;
    position.claimed = true;

    Ok(())
}
```

**Key implementation detail:** The payout formula requires `u128` intermediate values to prevent overflow. A user with `user_winning_amount = 1_000_000_000_000` (1M USDC) and `total_pool = 10_000_000_000_000` (10M USDC) would overflow u64 multiplication (`1e12 * 1e13 = 1e25 > u64::MAX ~= 1.8e19`). Using `u128` for the multiplication then casting back to `u64` after division handles this safely.

**Two separate token transfers:** The instruction performs two SPL Token CPIs -- one for the net payout to the winner and one for the fee to the fee_recipient. Both use the same Market PDA signer_seeds since Market is the vault authority. The `signer_seeds` reference must be computed once and reused.

### Pattern 5: Edge Case -- All Bets on Winning Side
**What:** When `losing_pool = 0` (all bets on the winning side), `total_pool == winning_pool`, so `gross_payout = user_winning_amount * winning_pool / winning_pool = user_winning_amount`. Winners get their original bet back minus fee.
**When to use:** Automatic -- the formula handles this case correctly without special-casing.

The formula `user_winning_amount * total_pool / winning_pool` naturally degenerates to `user_winning_amount * 1 = user_winning_amount` when `total_pool == winning_pool`. No conditional logic needed.

### Anti-Patterns to Avoid
- **Computing payouts inside MPC:** RES-09 explicitly requires plaintext math after reveal. Individual payout computation happens on-chain with revealed pool totals.
- **Push model (batch distribution):** Solana transaction account limits make batch payouts infeasible. Pull model (each winner calls claim_payout) is the correct approach per CONTEXT.md.
- **Passing winning_outcome into compute_payouts circuit:** Unnecessary complexity. Reveal both pools, let on-chain code select the winner. Keeps circuit minimal.
- **Using Market.state = Locked(1) for resolution:** The Locked(1) value exists in the Market struct comment but is unused. resolve_market goes directly Open(0) -> Resolved(2). Adding an intermediate state creates unnecessary complexity.
- **Allowing claim before Finalized(4):** Claims MUST wait until compute_payouts_callback has written revealed pool totals. Checking `state == 4` prevents claims with zero/stale revealed values.
- **Re-borrowing market after CPI in claim_payout:** Two sequential CPIs (payout transfer + fee transfer) need careful borrow management. Extract `market_id` and `bump` into local variables before CPI calls to avoid borrow checker issues (established pattern from Phase 5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPL Token transfer with PDA authority | Manual invoke_signed | `CpiContext::new_with_signer` with Anchor's signer_seeds | Anchor handles seed derivation; established pattern from update_pool_callback |
| Overflow-safe payout math | Custom bignum library | `u128` intermediate with checked_mul/checked_div, then cast to u64 | Standard Rust pattern; u128 is natively supported and sufficient for USDC amounts |
| MPC queue + callback | Custom computation submission | `queue_computation` macro + `#[callback_accounts]` + `#[arcium_callback]` | Established in Phase 3; handles mempool interaction, computation PDA derivation |
| Comp def registration | Custom circuit registration | `#[init_computation_definition_accounts]` macro | Exact pattern from init_update_pool_comp_def.rs |
| Circuit output deserialization | Manual byte parsing | `SignedComputationOutputs<T>` with generated output types | Arcium macro generates output structs; verify_output handles signature validation |
| Timestamp validation | Manual slot-based timing | `Clock::get()?.unix_timestamp` | Standard Solana pattern used throughout codebase |

**Key insight:** Phase 6 introduces no new technical patterns. Every component follows an established pattern from Phase 3 or Phase 5. The compute_payouts circuit is a simplified version of update_pool (fewer inputs, simpler output). The claim_payout instruction is a variation of the vault refund pattern from update_pool_callback. The resolve_market instruction is a simple state transition similar to create_market's validation logic.

## Common Pitfalls

### Pitfall 1: Overflow in Payout Multiplication
**What goes wrong:** `user_winning_amount * total_pool` overflows u64 when both values are large USDC amounts.
**Why it happens:** u64 max is ~18.4 quintillion. With USDC (6 decimals), 1M USDC = 1e12 lamports. Two large amounts multiplied exceed u64.
**How to avoid:** Cast to u128 before multiplication: `(user_winning_amount as u128).checked_mul(total_pool as u128).unwrap().checked_div(winning_pool as u128).unwrap() as u64`.
**Warning signs:** Payout calculation panics or returns incorrect values for large bets.

### Pitfall 2: Rounding Dust Accumulation
**What goes wrong:** Integer division floors individual payouts, so the sum of all payouts may be less than total_pool. If the vault has exact total_pool balance, later claimants can still claim because dust stays in vault.
**Why it happens:** Floor division inherently loses fractions. E.g., 3 winners splitting 10 USDC equally: each gets floor(10/3) = 3, total distributed = 9, dust = 1.
**How to avoid:** Per CONTEXT.md: "floor individual payouts, dust stays in market vault (immaterial amounts)." This is the intended behavior. Do NOT attempt to distribute dust to the last claimant or sweep to protocol.
**Warning signs:** Vault retains small residual balance after all winners claim. This is expected.

### Pitfall 3: compute_payouts Output Type Mismatch
**What goes wrong:** The generated output type for `compute_payouts` doesn't match the expected struct pattern, causing compilation errors in the callback handler.
**Why it happens:** Arcium macro code generation for circuit output types follows a specific naming convention. For `(u64, u64)` return, the generated type structure depends on how Arcium handles tuples of revealed values vs encrypted values.
**How to avoid:** After adding the circuit to `encrypted-ixs/src/lib.rs` and building, check the generated types in `target/` for `ComputePayoutsOutput`. The update_pool precedent suggests `ComputePayoutsOutput { field_0: ComputePayoutsOutputStruct0 { field_0: u64, field_1: u64 } }`. Build early and inspect generated types before writing the callback handler.
**Warning signs:** Compilation errors in compute_payouts_callback referencing unknown types.

### Pitfall 4: Market Account Size Increase
**What goes wrong:** Adding `revealed_yes_pool: u64` and `revealed_no_pool: u64` (16 bytes total) to Market increases `Market::INIT_SPACE`. Existing Market accounts have insufficient space.
**Why it happens:** `#[derive(InitSpace)]` auto-calculates but existing accounts were created with the old size.
**How to avoid:** Since this is pre-launch development with no production markets, all testing creates fresh markets with the new size. Document incompatibility with any existing devnet markets.
**Warning signs:** Anchor deserialization errors loading old Market accounts. Same issue as Phase 5 (documented and accepted).

### Pitfall 5: Fee Transfer Fails When fee_recipient Has No Token Account
**What goes wrong:** `claim_payout` tries to transfer fee to `config_fee_recipient`'s token account, but that account doesn't exist.
**Why it happens:** The `config_fee_recipient` was set during `initialize` as a Pubkey, but nobody created an associated token account for it.
**How to avoid:** Require the fee_recipient_token_account in the `ClaimPayout` accounts struct with proper validation (`token::authority = market.config_fee_recipient`). The fee_recipient must have an ATA for USDC before any claims can process. This is a deployment/setup concern -- ensure the fee_recipient ATA exists as part of protocol initialization.
**Warning signs:** `claim_payout` fails with "Account not initialized" for fee_recipient_token_account.

### Pitfall 6: Double-Claim from Concurrent Transactions
**What goes wrong:** A winner submits two `claim_payout` transactions simultaneously. Both read `position.claimed = false`, both proceed, and the winner gets paid twice.
**Why it happens:** Solana processes transactions concurrently by default.
**How to avoid:** Solana's runtime prevents this naturally. Both transactions write to the same UserPosition account (marking `claimed = true`). The Solana runtime serializes transactions that write to the same account. The second transaction will read the updated `claimed = true` and fail with AlreadyClaimed. No special handling needed.
**Warning signs:** None -- Solana handles this correctly.

### Pitfall 7: Borrow Checker Issues with Two Sequential CPIs
**What goes wrong:** `claim_payout` performs two token transfers (payout + fee). After the first CPI, the market Account borrow is invalidated, so signer_seeds cannot be recomputed for the second CPI.
**Why it happens:** Anchor's CpiContext borrows account references. After CPI, the borrow ends but reacquiring mutable market reference can conflict.
**How to avoid:** Extract `market_id`, `bump`, `config_fee_bps`, `winning_outcome`, `revealed_yes_pool`, `revealed_no_pool` as local Copy values before any CPI. Use these locals for signer_seeds construction and fee calculation. Re-acquire mutable market reference only after all CPIs complete (for setting claimed = true on position). This pattern is established in Phase 5's update_pool_callback.
**Warning signs:** Borrow checker errors about conflicting mutable/immutable borrows on market.

### Pitfall 8: ArgBuilder for compute_payouts Missing Shared Secret
**What goes wrong:** Trying to use `ArgBuilder::new().x25519_pubkey(...)` for compute_payouts, which doesn't have user-encrypted input.
**Why it happens:** Copy-pasting from update_pool which takes Enc<Shared, BetInput>. compute_payouts only takes Enc<Mxe, PoolTotals> (account read), not shared-encrypted input.
**How to avoid:** compute_payouts ArgBuilder only needs `.account()` -- no `.x25519_pubkey()`, no `.plaintext_u128()`, no `.encrypted_*()`. The circuit input is purely from on-chain state.
**Warning signs:** Arcium MPC computation fails with "invalid argument" or "unexpected input."

## Code Examples

Verified patterns from the existing codebase and official sources:

### compute_payouts Circuit (encrypted-ixs/src/lib.rs)
```rust
// Source: Existing update_pool pattern + ARCHITECTURE.md design + CONTEXT.md decisions
// Add to the #[encrypted] mod circuits block

/// Reveal encrypted pool totals at market resolution.
///
/// Takes the encrypted PoolTotals and returns both values as plaintext.
/// This is the moment privacy ends -- pool totals become public at resolution.
/// Payout math uses these revealed values on-chain (RES-09).
#[instruction]
pub fn compute_payouts(
    pool_ctxt: Enc<Mxe, PoolTotals>,
) -> (u64, u64) {
    let pool = pool_ctxt.to_arcis();
    // pool[0] = yes_pool, pool[1] = no_pool
    (pool[0].reveal(), pool[1].reveal())
}
```

### init_compute_payouts_comp_def (Registration)
```rust
// Source: Exact copy of init_update_pool_comp_def.rs with "compute_payouts" substituted
use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

use crate::ID;

pub fn handler(ctx: Context<InitComputePayoutsCompDef>) -> Result<()> {
    init_comp_def(ctx.accounts, None, None)?;
    Ok(())
}

#[init_computation_definition_accounts("compute_payouts", payer)]
#[derive(Accounts)]
pub struct InitComputePayoutsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: address_lookup_table, checked by arcium program
    pub address_lookup_table: UncheckedAccount<'info>,

    /// CHECK: lut_program, address lookup table program
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}
```

### compute_payouts Queue Instruction
```rust
// Source: Simplified version of update_pool.rs (no user-encrypted inputs)
#[queue_computation_accounts("compute_payouts", payer)]
#[derive(Accounts)]
pub struct ComputePayouts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        seeds = [b"market_pool", market_pool.market_id.to_le_bytes().as_ref()],
        bump = market_pool.bump,
        constraint = market_pool.market_id == market.id,
    )]
    pub market_pool: Account<'info, MarketPool>,

    // Standard Arcium accounts (same as update_pool)
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut, address = derive_sign_pda!())]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    // ... remaining Arcium accounts identical to update_pool ...
}
```

### compute_payouts_callback Struct
```rust
// Source: Simplified version of update_pool_callback.rs
#[callback_accounts("compute_payouts")]
#[derive(Accounts)]
pub struct ComputePayoutsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(comp_def_offset("compute_payouts")))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account, verified by arcium
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,

    /// The Market account to write revealed pool totals and set Finalized state.
    #[account(mut)]
    pub market: Account<'info, Market>,
}
```

### ClaimPayout Account Struct
```rust
// Source: Combines patterns from place_bet (vault access) and update_pool_callback (PDA signer)
#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    pub winner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"position", market.id.to_le_bytes().as_ref(), winner.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.user == winner.key(),
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Market vault (source for payout transfer)
    #[account(
        mut,
        seeds = [b"vault", market.id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    /// Winner's USDC token account (destination for payout)
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = winner,
    )]
    pub winner_token_account: Account<'info, TokenAccount>,

    /// Fee recipient's USDC token account (destination for protocol fee)
    #[account(
        mut,
        token::mint = usdc_mint,
        constraint = fee_recipient_token_account.owner == market.config_fee_recipient,
    )]
    pub fee_recipient_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
```

### Market Struct Additions
```rust
// Add to existing Market struct in state/market.rs
// After existing fields, before bump fields:

/// Revealed yes pool total (set by compute_payouts_callback at Finalized state)
pub revealed_yes_pool: u64,
/// Revealed no pool total (set by compute_payouts_callback at Finalized state)
pub revealed_no_pool: u64,
```

### New Error Variants
```rust
// Add to errors.rs AvenirError enum:

#[msg("Market is not in Resolved state")]
MarketNotResolved,
#[msg("Market is not in Finalized state")]
MarketNotFinalized,
#[msg("No winning position to claim")]
NoWinningPosition,
#[msg("Payout has already been claimed")]
AlreadyClaimed,
#[msg("Caller is not the market creator")]
NotMarketCreator,
#[msg("Market deadline has not passed yet")]
MarketNotExpired,
#[msg("Invalid winning outcome (must be 1=Yes or 2=No)")]
InvalidOutcome,
```

### Test Helper Addition (initCompDef)
```typescript
// Add to tests/mpc/helpers.ts initCompDef switch statement:
case "compute_payouts":
    await program.methods
        .initComputePayoutsCompDef()
        .accountsPartial(accounts)
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    break;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Oracle-based auto-resolution | Creator + dispute model | By design | No oracle dependency; creator resolves, disputes handled in Phase 8 |
| Push model (batch payout) | Pull model (individual claims) | By design | Solana account limits make batch infeasible; pull is standard (Polymarket, Augur v2 patterns) |
| Division in MPC for payout ratios | Reveal pools via MPC, compute ratios on-chain | By design (RES-09) | Division inside MPC is prohibitively expensive; plaintext math after reveal is fast and cheap |

**Deprecated/outdated:**
- None relevant. All patterns used are current Anchor 0.32.1 and Arcium 0.8.5 standard.

## Open Questions

1. **compute_payouts output type structure for two revealed u64 values**
   - What we know: update_pool returns `(Enc<Mxe, PoolTotals>, u8)` and generates nested `UpdatePoolOutputStruct0 { field_0: MXEEncryptedStruct<2>, field_1: u8 }`. The `u8` (from `.reveal()`) appears as a plain `u8` in the output.
   - What's unclear: For `(u64, u64)` where both are `.reveal()`'d, the exact generated struct shape. Could be `ComputePayoutsOutput { field_0: u64, field_1: u64 }` (flat) or nested `ComputePayoutsOutput { field_0: ComputePayoutsOutputStruct0 { field_0: u64, field_1: u64 } }` (tuple-wrapped).
   - Recommendation: Build the circuit and program first, check generated types in `target/`, then implement the callback handler to match. This is a LOW risk -- the types will be clear after compilation.

2. **Whether mpc_lock timeout recovery is needed for compute_payouts**
   - What we know: place_bet has 60s timeout recovery for mpc_lock. compute_payouts also uses mpc_lock.
   - What's unclear: Should compute_payouts also have timeout recovery? If MPC fails without callback, the market stays in Resolved with mpc_lock = true forever.
   - Recommendation: Yes, add the same timeout recovery pattern. compute_payouts can check `mpc_lock && lock_timestamp > 60s` and clear the lock to allow retry. No refund needed since compute_payouts doesn't hold user funds.

3. **Fee recipient token account validation**
   - What we know: `market.config_fee_recipient` stores a Pubkey snapshotted at market creation. `claim_payout` needs the fee_recipient's USDC ATA.
   - What's unclear: How to validate the fee_recipient_token_account matches the expected ATA. Using `constraint = fee_recipient_token_account.owner == market.config_fee_recipient` validates the owner but could allow any token account owned by that pubkey.
   - Recommendation: Use `token::authority = market.config_fee_recipient` constraint OR validate it's the associated token address. Simpler approach: just validate the token account owner matches config_fee_recipient. For v1, this is sufficient.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `programs/avenir/src/instructions/mpc/update_pool.rs` -- Queue computation pattern with ArgBuilder.account() for MarketPool reads
- Existing codebase: `programs/avenir/src/instructions/mpc/update_pool_callback.rs` -- Callback struct pattern with `#[callback_accounts]`
- Existing codebase: `programs/avenir/src/instructions/mpc/init_update_pool_comp_def.rs` -- Comp def registration pattern
- Existing codebase: `programs/avenir/src/instructions/place_bet.rs` -- SPL Token CPI with vault, PDA signer_seeds, UserPosition validation
- Existing codebase: `encrypted-ixs/src/lib.rs` -- Circuit patterns: `Enc<Mxe, PoolTotals>` input, `.reveal()` for plaintext output, `PoolTotals = [u64; 2]`
- Existing codebase: `programs/avenir/src/state/market.rs` -- Market struct fields, PDA seeds, state values
- Existing codebase: `programs/avenir/src/state/user_position.rs` -- UserPosition struct with claimed field
- `.planning/research/ARCHITECTURE.md` lines 344-362 -- compute_payouts circuit design with `.reveal()` pattern

### Secondary (MEDIUM confidence)
- `.planning/phases/06-resolution-payouts/06-CONTEXT.md` -- User decisions constraining implementation (locked decisions, edge case policies)
- `.planning/REQUIREMENTS.md` -- RES-01, RES-02, RES-07, RES-08, RES-09 requirement definitions
- Phase 5 research and summaries -- Established patterns for callback CPI, borrow checker workarounds, init_if_needed usage

### Tertiary (LOW confidence)
- compute_payouts output type structure -- Predicted based on update_pool output pattern but not verified. Must be confirmed after building the circuit.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already in use; no new dependencies
- Architecture: HIGH -- Every pattern directly follows established Phase 3/5 precedents. resolve_market is trivially simple. compute_payouts MPC flow is a simplified update_pool. claim_payout is a vault transfer pattern.
- Pitfalls: HIGH -- Overflow prevention, borrow checker, and output type concerns are well-documented from prior phases
- Circuit design: MEDIUM -- .reveal() on u64 is established for u8; extrapolation to u64 is logical but unverified for the specific output struct shape
- Edge cases: HIGH -- All-bets-on-one-side handled naturally by the formula; dust/rounding policy explicitly documented in CONTEXT.md

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- Anchor 0.32.1 and Arcium 0.8.5 are pinned versions)
