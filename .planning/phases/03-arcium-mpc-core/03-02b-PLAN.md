---
phase: 03-arcium-mpc-core
plan: 02b
type: execute
wave: 2
depends_on: [03-02a]
files_modified:
  - programs/avenir/src/instructions/mpc/mod.rs
  - programs/avenir/src/instructions/mpc/init_pool_comp_def.rs
  - programs/avenir/src/instructions/mpc/init_pool.rs
  - programs/avenir/src/instructions/mpc/init_pool_callback.rs
  - programs/avenir/src/instructions/mpc/init_update_pool_comp_def.rs
  - programs/avenir/src/instructions/mpc/update_pool.rs
  - programs/avenir/src/instructions/mpc/update_pool_callback.rs
  - programs/avenir/src/instructions/create_market.rs
  - programs/avenir/src/lib.rs
  - programs/avenir/src/errors.rs
autonomous: true
requirements: [INF-02, INF-03]

must_haves:
  truths:
    - "init_pool circuit initializes zero-valued encrypted pool totals via MPC and writes ciphertext to MarketPool account"
    - "init_pool is a separate instruction called after create_market to initialize encrypted pool state"
    - "update_pool requires non-zero pool ciphertext (from init_pool callback) to function correctly"
    - "update_pool_callback writes updated ciphertext and nonce back to MarketPool and updates sentiment on Market"
    - "create_market initializes an empty MarketPool PDA alongside Market (but does NOT trigger init_pool MPC)"
  artifacts:
    - path: "programs/avenir/src/instructions/mpc/update_pool.rs"
      provides: "Queue update_pool MPC computation with ArgBuilder"
      contains: "ArgBuilder"
    - path: "programs/avenir/src/instructions/mpc/update_pool_callback.rs"
      provides: "Callback handler that writes MPC output back to MarketPool"
      contains: "arcium_callback"
    - path: "programs/avenir/src/instructions/mpc/init_pool_callback.rs"
      provides: "Callback for init_pool that initializes MarketPool ciphertext"
      contains: "arcium_callback"
    - path: "programs/avenir/src/instructions/mpc/init_pool.rs"
      provides: "Queue init_pool MPC computation"
      contains: "queue_computation"
  key_links:
    - from: "programs/avenir/src/instructions/mpc/update_pool.rs"
      to: "programs/avenir/src/state/market_pool.rs"
      via: "ArgBuilder.account() reading ciphertext at fixed byte offset from MarketPool PDA"
      pattern: "ArgBuilder.*account"
    - from: "programs/avenir/src/instructions/mpc/update_pool_callback.rs"
      to: "programs/avenir/src/state/market_pool.rs"
      via: "Writing o.ciphertexts and o.nonce back to MarketPool fields"
      pattern: "o\\.ciphertexts|o\\.nonce"
    - from: "programs/avenir/src/instructions/mpc/update_pool_callback.rs"
      to: "programs/avenir/src/state/market.rs"
      via: "Updating Market.sentiment and Market.mpc_lock from callback"
      pattern: "market\\.sentiment|market\\.mpc_lock"
    - from: "programs/avenir/src/instructions/create_market.rs"
      to: "programs/avenir/src/state/market_pool.rs"
      via: "create_market initializes empty MarketPool PDA alongside Market"
      pattern: "MarketPool"
    - from: "programs/avenir/src/instructions/create_market.rs"
      to: "programs/avenir/src/instructions/mpc/init_pool.rs"
      via: "After create_market, init_pool must be called separately to populate MarketPool with encrypted zeros via MPC"
      pattern: "init_pool"
---

<objective>
Write all Anchor instructions for init_pool and update_pool MPC computations: comp_def initializers, queue instructions, and callbacks. Update create_market to initialize the MarketPool PDA.

Purpose: These instructions wire the update_pool circuit (from 03-02a) into the Anchor program, enabling the encrypted state relay pattern: create market -> init pool via MPC -> accept bets via update_pool MPC -> callback writes results.
Output: Complete instruction set for pool initialization and update, MarketPool PDA created in create_market.
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
@.planning/phases/03-arcium-mpc-core/03-02a-SUMMARY.md

<interfaces>
<!-- Key types from 03-02a that this plan uses. -->

From programs/avenir/src/state/market_pool.rs (03-02a):
```rust
#[account]
#[derive(InitSpace)]
pub struct MarketPool {
    pub market_id: u64,
    pub yes_pool_encrypted: [u8; 32],
    pub no_pool_encrypted: [u8; 32],
    pub nonce: u128,
    pub bump: u8,
}
// PDA seeds: [b"market_pool", market_id.to_le_bytes()]
// Byte offset to yes_pool_encrypted: 8 (discriminator) + 8 (market_id) = 16
// Byte range for both ciphertexts: 64 bytes (32 + 32)
```

From programs/avenir/src/state/market.rs (03-02a):
```rust
pub struct Market {
    // ... (encrypted fields moved to MarketPool)
    pub sentiment: u8,     // Updated by update_pool_callback
    pub mpc_lock: bool,    // Set before MPC, cleared in callback
    pub total_bets: u64,   // Incremented in callback
    pub market_pool_bump: u8,
}
```

From encrypted-ixs/src/lib.rs (03-02a):
```rust
pub struct BetInput { pub is_yes: bool, pub amount: u64 }
#[instruction]
pub fn update_pool(bet_ctxt: Enc<Shared, BetInput>, pool_ctxt: Enc<Mxe, PoolTotals>) -> (Enc<Mxe, PoolTotals>, u8) { ... }
```

From programs/avenir/src/lib.rs (after 03-01):
```rust
#[arcium_program]  // Changed from #[program] in 03-01
pub mod avenir {
    // ... existing handlers + hello_world MPC handlers
}
```

From programs/avenir/src/instructions/mpc/mod.rs (after 03-01):
```rust
pub mod init_hello_world_comp_def;
pub mod hello_world;
pub mod hello_world_callback;
```

From programs/avenir/src/instructions/create_market.rs (key patterns):
- Market PDA: seeds = [b"market", market_id.to_le_bytes()]
- MarketVault: seeds = [b"vault", market_id.to_le_bytes()]
- Uses config.market_counter for market_id
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write init_pool Anchor instructions (comp_def, queue, callback)</name>
  <files>
    programs/avenir/src/instructions/mpc/mod.rs,
    programs/avenir/src/instructions/mpc/init_pool_comp_def.rs,
    programs/avenir/src/instructions/mpc/init_pool.rs,
    programs/avenir/src/instructions/mpc/init_pool_callback.rs,
    programs/avenir/src/lib.rs
  </files>
  <action>
**IMPORTANT: init_pool is a separate instruction that must be called after create_market to initialize encrypted pool state. create_market creates the empty MarketPool PDA (all zeros), but the encrypted zero-values for the pool must be generated by the MPC network via init_pool. update_pool will require non-zero pool ciphertext (from init_pool callback) to function correctly -- calling update_pool before init_pool has completed will result in MPC decryption failure because the pool ciphertext is not valid MXE-encrypted data.**

**Step 1: Write init_pool_comp_def instruction**
Same pattern as init_hello_world_comp_def from 03-01:
```rust
#[init_computation_definition_accounts("init_pool")]
#[derive(Accounts)]
pub struct InitPoolCompDef<'info> { ... }
```

**Step 2: Write queue init_pool instruction**
When a market is created, init_pool must be called separately to initialize its encrypted pool state to zeros. The `init_pool` circuit takes only `Mxe` and returns `Enc<Mxe, PoolTotals>`:
```rust
let args = ArgBuilder::new().build();  // init_pool takes no user inputs
```
Queue computation, with callback pointing to `init_pool_callback`.
The MarketPool PDA must already exist (created by create_market) before the callback writes to it.

**Step 3: Write init_pool_callback instruction**
```rust
#[arcium_callback(encrypted_ix = "init_pool")]
pub fn init_pool_callback(
    ctx: Context<InitPoolCallback>,
    output: SignedComputationOutputs<InitPoolOutput>,
) -> Result<()> {
    let o = output.verify_output(...)?;
    // Write initial encrypted zeros to MarketPool
    ctx.accounts.market_pool.yes_pool_encrypted = o.ciphertexts[0];
    ctx.accounts.market_pool.no_pool_encrypted = o.ciphertexts[1];
    ctx.accounts.market_pool.nonce = o.nonce;
    Ok(())
}
```
MarketPool must be `#[account(mut)]` and passed via `CallbackAccount { pubkey, is_writable: true }`.

**Step 4: Wire handlers in lib.rs**
Add handler functions for init_pool_comp_def, init_pool (queue), init_pool_callback.

**Step 5: Update mpc/mod.rs**
Add init_pool_comp_def, init_pool, init_pool_callback modules.
  </action>
  <verify>
    <automated>cd /Users/laitsky/Developments/avenir && arcium build 2>&1 | tail -5</automated>
  </verify>
  <done>
    init_pool instructions compile: comp_def initializer, queue instruction, callback that writes encrypted zeros to MarketPool. init_pool is documented as a required step after create_market before any update_pool calls.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write update_pool Anchor instructions, update create_market, and add error variant</name>
  <files>
    programs/avenir/src/instructions/mpc/mod.rs,
    programs/avenir/src/instructions/mpc/init_update_pool_comp_def.rs,
    programs/avenir/src/instructions/mpc/update_pool.rs,
    programs/avenir/src/instructions/mpc/update_pool_callback.rs,
    programs/avenir/src/instructions/create_market.rs,
    programs/avenir/src/lib.rs,
    programs/avenir/src/errors.rs
  </files>
  <action>
**Step 1: Write init_update_pool_comp_def instruction**
```rust
#[init_computation_definition_accounts("update_pool")]
#[derive(Accounts)]
pub struct InitUpdatePoolCompDef<'info> { ... }
```

**Step 2: Write queue update_pool instruction**
This is the core instruction called when a user places a bet:
```rust
pub fn handler(
    ctx: Context<UpdatePool>,
    computation_offset: u64,
    is_yes_ciphertext: [u8; 32],
    amount_ciphertext: [u8; 32],
    pub_key: [u8; 32],
    nonce: u128,
) -> Result<()> {
    // Check mpc_lock
    require!(!ctx.accounts.market.mpc_lock, AvenirError::MpcLocked);
    // Set mpc_lock
    ctx.accounts.market.mpc_lock = true;

    let args = ArgBuilder::new()
        .x25519_pubkey(pub_key)
        .plaintext_u128(nonce)
        .encrypted_bool(is_yes_ciphertext)  // BetInput.is_yes
        .encrypted_u64(amount_ciphertext)    // BetInput.amount
        .account(
            ctx.accounts.market_pool.key(),
            16,    // offset: 8 (discriminator) + 8 (market_id) = 16 bytes to yes_pool_encrypted
            64,    // length: 32 (yes_pool) + 32 (no_pool) = 64 bytes
        )
        .build();
    // Queue computation with callback to update_pool_callback
}
```

The MarketPool byte offset is FIXED at 16 because:
- 8 bytes: Anchor discriminator
- 8 bytes: market_id (u64)
- Next 64 bytes: yes_pool_encrypted [u8;32] + no_pool_encrypted [u8;32]

The nonce field (u128 = 16 bytes) comes AFTER the ciphertexts. Verify whether ArgBuilder.account() needs to include the nonce in the byte range or not. The voting example includes vote_state (ciphertexts) in the account() range. Check if nonce needs to be included separately.

**Step 3: Write update_pool_callback instruction**
```rust
#[arcium_callback(encrypted_ix = "update_pool")]
pub fn update_pool_callback(
    ctx: Context<UpdatePoolCallback>,
    output: SignedComputationOutputs<UpdatePoolOutput>,
) -> Result<()> {
    let o = output.verify_output(...)?;
    // Write updated pool ciphertexts back to MarketPool
    ctx.accounts.market_pool.yes_pool_encrypted = o.ciphertexts[0];
    ctx.accounts.market_pool.no_pool_encrypted = o.ciphertexts[1];
    ctx.accounts.market_pool.nonce = o.nonce;
    // Write revealed sentiment to Market (plaintext)
    // How sentiment is returned depends on circuit return type:
    // If (Enc<Mxe, PoolTotals>, u8) maps to ciphertexts[0..1] + plaintext,
    // extract sentiment from the output accordingly.
    ctx.accounts.market.sentiment = /* extracted sentiment value */;
    // Release mpc_lock
    ctx.accounts.market.mpc_lock = false;
    // Increment total_bets
    ctx.accounts.market.total_bets += 1;
    Ok(())
}
```

Both `market_pool` and `market` must be mutable CallbackAccounts.

**Step 4: Update create_market to initialize MarketPool PDA**
Modify `programs/avenir/src/instructions/create_market.rs` to also create the MarketPool PDA alongside the Market:
- Add MarketPool init account to CreateMarket accounts struct
- Seeds: `[b"market_pool", market_id.to_le_bytes()]`
- Initialize MarketPool with market_id and bump
- NOTE: create_market only creates the empty MarketPool PDA. The init_pool MPC instruction must be called separately afterward to populate it with valid encrypted zeros. update_pool depends on init_pool having completed successfully.

**Step 5: Add MpcLocked error variant**
Add to `programs/avenir/src/errors.rs`:
```rust
#[msg("Market MPC computation is in progress")]
MpcLocked,
```

**Step 6: Wire all handlers in lib.rs and update mpc/mod.rs**
Add handler functions for:
- `init_update_pool_comp_def`
- `update_pool` (queue)
- `update_pool_callback`

**Step 7: Verify build**
Run `arcium build` (compiles both program and circuits). Verify no Rust compilation errors.
  </action>
  <verify>
    <automated>cd /Users/laitsky/Developments/avenir && arcium build 2>&1 | tail -5</automated>
  </verify>
  <done>
    All update_pool instructions compile: comp_def initializer, queue instruction with ArgBuilder and mpc_lock, callback with ciphertext/nonce writeback and sentiment update. MarketPool PDA initialized in create_market. MpcLocked error variant added. init_pool -> update_pool dependency clearly documented.
  </done>
</task>

</tasks>

<verification>
1. `arcium build` compiles program + all 3 circuits (init_pool, hello_world, update_pool) without errors
2. init_pool instructions: comp_def initializer, queue, callback all compile
3. update_pool instructions: comp_def initializer, queue with ArgBuilder, callback with state writeback all compile
4. create_market initializes MarketPool PDA alongside Market
5. update_pool queue instruction checks and sets mpc_lock before queuing
6. update_pool_callback writes ciphertexts, nonce, and sentiment back to respective accounts
7. MpcLocked error variant exists in errors.rs
</verification>

<success_criteria>
- Complete instruction set: init_pool comp_def + queue + callback, update_pool comp_def + queue + callback
- mpc_lock prevents concurrent update_pool calls
- create_market creates both Market and MarketPool PDAs
- init_pool -> update_pool dependency is explicit: init_pool must complete before update_pool can succeed
- `arcium build` succeeds with all circuits and Anchor program
</success_criteria>

<output>
After completion, create `.planning/phases/03-arcium-mpc-core/03-02b-SUMMARY.md`
</output>
