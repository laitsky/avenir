# Phase 2: Market Creation - Research

**Researched:** 2026-03-03
**Domain:** Solana program instructions (Anchor 0.32.1) -- whitelist PDA, market creation, category tagging, deadline validation, market cancellation
**Confidence:** HIGH

## Summary

Phase 2 adds four Solana program instructions to the existing Avenir program scaffold: `add_creator` / `remove_creator` for whitelist management, `create_market` for market creation with vault initialization, and `cancel_market` for rent reclamation on empty markets. The existing `Market` struct needs one new field (`resolution_source`), and a new `CreatorWhitelist` PDA struct must be created. All patterns are well-established Anchor 0.32.1 idioms verified against official documentation.

The core technical challenge is straightforward: PDA derivation for the whitelist account, token account initialization for the USDC vault, and Clock sysvar validation for deadlines. The existing codebase from Phase 1 already establishes every pattern needed -- `InitSpace` derive, PDA seeds, account constraints, error codes. Phase 2 is pure additive work on a solid foundation.

The cancel_market instruction requires closing both a PDA account and a PDA-owned token account, which involves CPI to the Token program's `close_account` instruction with PDA signer seeds. This is the only non-trivial pattern in this phase.

**Primary recommendation:** Implement instructions in dependency order: whitelist management first (add_creator/remove_creator), then create_market (which depends on whitelist PDA existing), then cancel_market. Add the `resolution_source` String field to Market struct with `#[max_len(128)]` -- 128 bytes accommodates any URL or reference text while keeping rent reasonable (~0.003 SOL total for Market PDA).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Separate CreatorWhitelist PDA per approved creator address
- Admin-only management -- only Config admin can add/remove creators
- Minimal metadata: creator pubkey, active flag, bump
- Removing a creator from whitelist does NOT affect their existing markets -- only prevents new market creation
- create_market instruction checks CreatorWhitelist PDA exists and is active
- Free-text URL/reference field added to Market struct (e.g., "https://reuters.com" or "Official NBA results")
- Required on market creation -- cannot be empty
- Immutable after creation -- no updates allowed, prevents bait-and-switch after bets are placed
- `resolution_time` = bet cutoff time (when betting closes), NOT resolution deadline
- Creator has 48h grace period AFTER resolution_time to resolve (enforced in Phase 6)
- No crank or explicit lock instruction -- place_bet checks `clock.unix_timestamp > resolution_time` and rejects
- Market state stays Open until explicitly resolved (state field used by later phases for Locked/Resolved/Disputed)
- Creator can cancel market and reclaim rent ONLY if total_bets == 0 -- once someone bets, market must play out
- Protocol pause (Config.paused = true) blocks ALL instructions including market creation
- No creation fee beyond standard Solana rent (~0.003 SOL for Market PDA + vault)
- No maximum deadline duration -- markets can be years out
- No per-creator market limit -- whitelist curation is the quality gate
- Rent payer: market creator pays for Market PDA and vault token account allocation

### Claude's Discretion
- Resolution source field length (within reasonable bounds for on-chain storage)
- Minimum deadline duration (must be reasonable, e.g., 1h minimum)
- Whitelist instruction design (separate add/remove vs toggle pattern)
- Exact create_market instruction parameter ordering and validation sequence
- Error message wording for rejection cases

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MKT-01 | Whitelisted address can create a binary market with question, outcomes, deadline, category, and resolution source | CreatorWhitelist PDA pattern, create_market instruction with all fields, whitelist check via `has_one` or constraint, category u8 validation (0-4), resolution_source String field |
| MKT-02 | Markets are organized by category (Politics, Crypto, Sports, Culture, Economics) | Category stored as u8 on Market struct (already exists from Phase 1), validated with `require!(category <= 4)` in create_market handler |
| MKT-03 | Bets are rejected after market deadline passes (on-chain timestamp validation) | `Clock::get()?.unix_timestamp` comparison against `Market.resolution_time`; enforcement point is in place_bet (Phase 5), but create_market validates `resolution_time > now + minimum_duration` |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anchor-lang | 0.32.1 | Program framework | Already in use from Phase 1; PDA constraints, `#[derive(InitSpace)]`, `#[error_code]` |
| anchor-spl | 0.32.1 | SPL token integration | Already in Cargo.toml; `token::mint`, `token::authority` constraints for vault creation |
| spl-token | 7.0 | SPL token program types | Already in Cargo.toml; `TokenAccount`, `Mint`, `Token` types |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @coral-xyz/anchor | 0.32.1 | TypeScript client | Test scripts for create_market, whitelist instructions |
| @solana/web3.js | 1.x | Solana JS SDK | PDA derivation, transaction building in tests |
| @solana/spl-token | latest | SPL token test helpers | Creating USDC mint for test environment, minting test tokens |
| chai | latest | Test assertions | Already in use from Phase 1 tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate add/remove instructions | Single toggle instruction | Toggle is fewer instructions but less explicit; separate instructions are clearer in intent and audit trail. **Recommendation: separate instructions** |
| `has_one` constraint for whitelist check | `constraint` with manual PDA derivation | `has_one` requires the field to be ON the account being checked; since Market doesn't store whitelist reference, use `seeds` constraint to verify PDA exists. **Recommendation: seeds + constraint** |
| `init_if_needed` for whitelist PDA | `init` only | `init_if_needed` could allow re-activating a removed creator, but adds complexity. **Recommendation: use `init` for add, set active=false for remove** |

**Installation:**
```bash
# No new dependencies needed -- all already in Cargo.toml from Phase 1
# For tests, ensure spl-token helpers:
cd app && bun add @solana/spl-token
```

## Architecture Patterns

### Recommended File Structure
```
programs/avenir/src/
├── lib.rs                          # Add 4 new instruction endpoints
├── state/
│   ├── mod.rs                      # Add creator_whitelist export
│   ├── config.rs                   # Unchanged
│   ├── market.rs                   # Add resolution_source field
│   ├── user_position.rs            # Unchanged
│   └── creator_whitelist.rs        # NEW: CreatorWhitelist PDA struct
├── instructions/
│   ├── mod.rs                      # Add 4 new instruction exports
│   ├── initialize.rs               # Unchanged
│   ├── add_creator.rs              # NEW: Admin adds creator to whitelist
│   ├── remove_creator.rs           # NEW: Admin deactivates creator
│   ├── create_market.rs            # NEW: Whitelisted creator creates market
│   └── cancel_market.rs            # NEW: Creator cancels empty market
└── errors.rs                       # Add new error variants
```

### Pattern 1: CreatorWhitelist PDA
**What:** A per-creator PDA that proves an address is authorized to create markets. Seeded by `[b"whitelist", creator_pubkey]`. Admin-only creation and deactivation.
**When to use:** Checked during create_market to enforce whitelist.
**Example:**
```rust
// Source: Anchor PDA pattern, verified via official docs
#[account]
#[derive(InitSpace)]
pub struct CreatorWhitelist {
    /// The whitelisted creator's public key
    pub creator: Pubkey,
    /// Whether this creator is currently active
    pub active: bool,
    /// PDA bump seed
    pub bump: u8,
}

// PDA derivation: seeds = [b"whitelist", creator.key().as_ref()]
// Space: 8 (discriminator) + 32 (Pubkey) + 1 (bool) + 1 (u8) = 42 bytes
// Rent: ~0.001 SOL
```

### Pattern 2: Admin-Only Instruction with Config Check
**What:** Instruction that requires the signer to be the Config admin. Uses `has_one = admin` on Config account and `Signer` constraint on admin.
**When to use:** add_creator, remove_creator, and any future admin-only instructions.
**Example:**
```rust
// Source: Anchor has_one constraint docs
#[derive(Accounts)]
pub struct AddCreator<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ AvenirError::Unauthorized,
        constraint = !config.paused @ AvenirError::ProtocolPaused,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = admin,
        space = 8 + CreatorWhitelist::INIT_SPACE,
        seeds = [b"whitelist", creator.key().as_ref()],
        bump,
    )]
    pub whitelist: Account<'info, CreatorWhitelist>,

    /// CHECK: The creator address being whitelisted (not a signer)
    pub creator: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

### Pattern 3: Market Creation with Vault Initialization
**What:** Single instruction that atomically creates Market PDA, initializes USDC vault token account, and increments market counter. Market PDA is the vault authority.
**When to use:** create_market instruction.
**Example:**
```rust
// Source: Anchor token account docs + prediction market pattern
#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = !config.paused @ AvenirError::ProtocolPaused,
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"whitelist", creator.key().as_ref()],
        bump = whitelist.bump,
        constraint = whitelist.active @ AvenirError::CreatorNotWhitelisted,
    )]
    pub whitelist: Account<'info, CreatorWhitelist>,

    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", (config.market_counter + 1).to_le_bytes().as_ref()],
        bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        seeds = [b"vault", (config.market_counter + 1).to_le_bytes().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ AvenirError::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
```

### Pattern 4: Market Cancellation with Token Account Close
**What:** Creator cancels an empty market (total_bets == 0), closing both the Market PDA and the vault token account. Uses Anchor `close` constraint for PDA and CPI `token::close_account` for the vault. Market PDA signs as vault authority using seeds.
**When to use:** cancel_market instruction.
**Example:**
```rust
// Source: Anchor close + escrow cancel pattern
#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        has_one = creator @ AvenirError::Unauthorized,
        constraint = market.total_bets == 0 @ AvenirError::MarketHasBets,
        close = creator,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"vault", market.id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
```

### Pattern 5: Clock-Based Deadline Validation
**What:** Use `Clock::get()?.unix_timestamp` to validate that resolution_time is sufficiently in the future at market creation time. No need to pass Clock as an account.
**When to use:** create_market handler validation.
**Example:**
```rust
// Source: RareSkills Solana Clock tutorial, Anchor Clock::get() pattern
pub fn handler(ctx: Context<CreateMarket>, params: CreateMarketParams) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Minimum 1 hour in the future
    require!(
        params.resolution_time > now + 3600,
        AvenirError::DeadlineTooSoon
    );

    // Validate category (0-4)
    require!(
        params.category <= 4,
        AvenirError::InvalidCategory
    );

    // Validate resolution_source is not empty
    require!(
        !params.resolution_source.is_empty(),
        AvenirError::EmptyResolutionSource
    );

    // ... set market fields
    Ok(())
}
```

### Anti-Patterns to Avoid
- **Passing Clock as a Sysvar account:** `Clock::get()` is cheaper (no account deserialization) and doesn't require including `Sysvar<'info, Clock>` in accounts struct. Use `Clock::get()` in the handler function.
- **Using `init_if_needed` for whitelist PDA:** This would allow accidental re-initialization. Use `init` for add_creator and a field update for remove_creator. The `init` constraint will reject if PDA already exists (correct behavior -- admin must remove then re-add if needed).
- **Storing market counter in instruction params:** The market_id should be derived from `config.market_counter + 1` inside the instruction, not passed by the client. This prevents ID collisions and ensures sequential ordering.
- **Using `u64` for market_id in PDA seeds without `.to_le_bytes()`:** PDA seeds must be `&[u8]`. Always convert with `.to_le_bytes().as_ref()`.
- **Forgetting to increment market_counter:** After creating the market, `config.market_counter += 1` must happen in the handler. Without it, the next market creation will collide on PDA derivation.
- **Manual CPI for vault initialization:** Use Anchor's `token::mint` + `token::authority` constraints on `init`. They handle the full token account creation atomically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Whitelist check | Manual PDA derivation + comparison | Anchor `seeds` + `bump` constraint on CreatorWhitelist account | Anchor validates PDA derivation automatically; if PDA doesn't exist, Anchor rejects the transaction |
| Token vault creation | CPI to Token program manually | Anchor `token::mint` + `token::authority` on `init` | Handles rent, space, mint, authority atomically |
| Deadline validation | Custom timestamp parsing | `Clock::get()?.unix_timestamp` | Standard Solana pattern; i64 unix timestamp, consensus-agreed |
| Admin authorization | Manual pubkey comparison | `has_one = admin @ Error` constraint | Single-line, prevents forgotten checks, readable in audit |
| Account closure | Manual lamport transfer + zeroing | Anchor `close = recipient` constraint | Handles discriminator, lamport transfer, ownership change atomically |
| Token account closure | Manual CPI construction | `token::close_account` CPI helper | Anchor's `anchor_spl::token::close_account` handles the CPI context correctly |
| Market ID generation | Client-provided IDs | `config.market_counter + 1` auto-increment | Prevents collisions, ensures sequential ordering, single source of truth |

**Key insight:** Every operation in this phase has a built-in Anchor primitive. The only CPI needed is `token::close_account` in cancel_market, and even that has an `anchor_spl` helper.

## Common Pitfalls

### Pitfall 1: PDA Seed Order in Market ID
**What goes wrong:** Market PDA derivation fails or collides because seeds use wrong byte order.
**Why it happens:** `u64.to_le_bytes()` vs `u64.to_be_bytes()` -- using big-endian when little-endian was intended (or vice versa). The seeds in the `#[instruction]` attribute and the Anchor constraint must use the exact same encoding.
**How to avoid:** Always use `.to_le_bytes()` (little-endian) consistently for market_id in all seed derivations (Market PDA, Vault PDA, client-side derivation). Document this convention.
**Warning signs:** "A seeds constraint was violated" errors, or PDA not found when fetching by market_id.

### Pitfall 2: Market Counter Race Condition
**What goes wrong:** Two `create_market` transactions submitted simultaneously -- both read `market_counter = 5` and try to create market ID 6, one fails.
**Why it happens:** Solana transactions are processed in parallel within a slot. Both may read the same Config state.
**How to avoid:** This is actually handled automatically by Solana's runtime -- both transactions write to Config (mutable), so the runtime will serialize them. The second transaction will see the updated counter. No additional locking needed.
**Warning signs:** "Transaction simulation failed" with account conflict errors during high-throughput testing.

### Pitfall 3: Forgetting Protocol Pause Check
**What goes wrong:** Market creation or whitelist changes succeed even when protocol is paused.
**Why it happens:** Each instruction must independently check `config.paused`. It's easy to forget on new instructions.
**How to avoid:** Add `constraint = !config.paused @ AvenirError::ProtocolPaused` to the Config account in every instruction's accounts struct. Make this a code review checklist item.
**Warning signs:** Operations succeed when `config.paused = true`.

### Pitfall 4: Token Account Close Before PDA Close
**What goes wrong:** cancel_market closes the Market PDA first (via `close = creator`), then tries to close the vault using market PDA seeds for signing -- but the market PDA is already closed.
**Why it happens:** Anchor's `close` constraint runs at the end of instruction execution (during serialization/exit), not inline. But CPI calls happen during handler execution. The vault must be closed via CPI in the handler BEFORE Anchor closes the Market PDA.
**How to avoid:** In the cancel_market handler, explicitly call `token::close_account` CPI first. The Market PDA `close = creator` will execute after the handler returns. This ordering is correct because Anchor's close runs as an exit handler.
**Warning signs:** "Account not found" or "Invalid authority" errors on cancel_market.

### Pitfall 5: Clock Timestamp Drift
**What goes wrong:** Market created with deadline "1 hour from now" but timestamp check off by a few seconds.
**Why it happens:** Solana clock timestamp can have small drift (within 25% fast / 150% slow bounds relative to real-world time). Validators' reported timestamps may vary slightly.
**How to avoid:** Use reasonable minimum durations (1 hour = 3600 seconds provides ample buffer). Don't rely on second-level precision for deadline enforcement. The drift is typically < 1-2 seconds.
**Warning signs:** Intermittent test failures on exact-second boundary checks.

### Pitfall 6: String Length vs Byte Length
**What goes wrong:** `resolution_source` with non-ASCII characters (e.g., unicode URLs) exceeds `#[max_len(128)]` despite looking short.
**Why it happens:** `#[max_len(N)]` counts bytes, not characters. UTF-8 characters can be 1-4 bytes.
**How to avoid:** The `#[max_len(128)]` constraint checks byte length automatically. For URLs (ASCII-only), this is effectively 128 characters. Document that resolution_source is byte-limited, not character-limited. 128 bytes is sufficient for any practical URL.
**Warning signs:** "Account data too small" errors with seemingly short strings.

### Pitfall 7: Whitelist PDA Already Exists on Re-Add
**What goes wrong:** Admin removes a creator (sets active=false), then tries to re-add them. The `init` constraint fails because the PDA already exists.
**Why it happens:** `init` always tries to create a new account. An already-existing (but deactivated) whitelist PDA will cause a collision.
**How to avoid:** For remove_creator, do NOT close the PDA -- just set `active = false`. For re-adding, create a separate `reactivate_creator` instruction that uses `mut` instead of `init`, and sets `active = true`. OR close the PDA on removal and use `init` for re-add. **Recommendation:** Close on removal (use `close = admin`), so `init` works for re-add. Simpler model, saves rent when creator is removed.
**Warning signs:** "Account already in use" error when re-adding a previously removed creator.

## Code Examples

Verified patterns from official sources and existing codebase:

### CreatorWhitelist State
```rust
// Source: Anchor PDA pattern (anchor-lang.com/docs/basics/pda)
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CreatorWhitelist {
    /// The whitelisted creator's public key
    pub creator: Pubkey,
    /// Whether this creator is currently active (true after add, false never -- closed on remove)
    pub active: bool,
    /// PDA bump seed
    pub bump: u8,
}

// Seeds: [b"whitelist", creator_pubkey.as_ref()]
// Space: 8 + 32 + 1 + 1 = 42 bytes
```

### Updated Market State (with resolution_source)
```rust
// Source: Existing market.rs + CONTEXT.md decision
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub id: u64,
    #[max_len(200)]
    pub question: String,
    /// Resolution source URL or reference (e.g., "https://reuters.com")
    /// Required, immutable after creation
    #[max_len(128)]
    pub resolution_source: String,
    pub category: u8,
    pub resolution_time: i64,
    pub state: u8,
    pub winning_outcome: u8,
    pub yes_pool_encrypted: [u8; 32],
    pub no_pool_encrypted: [u8; 32],
    pub sentiment: u8,
    pub total_bets: u64,
    pub creator: Pubkey,
    pub created_at: i64,
    pub config_fee_recipient: Pubkey,
    pub config_fee_bps: u16,
    pub mpc_lock: bool,
    pub bump: u8,
    pub vault_bump: u8,
}

// New INIT_SPACE calculation:
// 8 (id) + 4+200 (question) + 4+128 (resolution_source) + 1 (category) +
// 8 (resolution_time) + 1 (state) + 1 (winning_outcome) +
// 32 (yes_pool) + 32 (no_pool) + 1 (sentiment) + 8 (total_bets) +
// 32 (creator) + 8 (created_at) + 32 (config_fee_recipient) +
// 2 (config_fee_bps) + 1 (mpc_lock) + 1 (bump) + 1 (vault_bump)
// = 505 bytes data
// + 8 discriminator = 513 bytes total
// Rent: ~0.0040 SOL (6,960 lamports/byte * 513 bytes = ~3,570,480 lamports)
```

### CreateMarketParams
```rust
// Source: Anchor instruction params pattern
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateMarketParams {
    pub question: String,
    pub resolution_source: String,
    pub category: u8,
    pub resolution_time: i64,
}
```

### create_market Handler
```rust
// Source: Prediction market pattern + Anchor Clock docs
pub fn handler(ctx: Context<CreateMarket>, params: CreateMarketParams) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Validate deadline is at least 1 hour in the future
    require!(
        params.resolution_time > now + 3600,
        AvenirError::DeadlineTooSoon
    );

    // Validate category (0=Politics, 1=Crypto, 2=Sports, 3=Culture, 4=Economics)
    require!(params.category <= 4, AvenirError::InvalidCategory);

    // Validate question length (Anchor checks max_len on init, but explicit check is clearer)
    require!(params.question.len() <= 200, AvenirError::QuestionTooLong);
    require!(!params.question.is_empty(), AvenirError::EmptyQuestion);

    // Validate resolution source is not empty
    require!(
        !params.resolution_source.is_empty(),
        AvenirError::EmptyResolutionSource
    );

    // Increment market counter
    let config = &mut ctx.accounts.config;
    config.market_counter += 1;
    let market_id = config.market_counter;

    // Initialize market
    let market = &mut ctx.accounts.market;
    market.id = market_id;
    market.question = params.question;
    market.resolution_source = params.resolution_source;
    market.category = params.category;
    market.resolution_time = params.resolution_time;
    market.state = 0; // Open
    market.winning_outcome = 0; // None
    market.yes_pool_encrypted = [0u8; 32];
    market.no_pool_encrypted = [0u8; 32];
    market.sentiment = 0; // Unknown
    market.total_bets = 0;
    market.creator = ctx.accounts.creator.key();
    market.created_at = now;
    market.config_fee_recipient = config.fee_recipient;
    market.config_fee_bps = config.protocol_fee_bps;
    market.mpc_lock = false;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.market_vault;

    Ok(())
}
```

### cancel_market Handler (with vault close CPI)
```rust
// Source: Anchor escrow cancel pattern + anchor-spl close_account
use anchor_spl::token::{self, CloseAccount};

pub fn handler(ctx: Context<CancelMarket>) -> Result<()> {
    // Close the vault token account first (CPI)
    // Market PDA signs as vault authority
    let market_id = ctx.accounts.market.id;
    let bump = ctx.accounts.market.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"market",
        &market_id.to_le_bytes(),
        &[bump],
    ]];

    let cpi_accounts = CloseAccount {
        account: ctx.accounts.market_vault.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::close_account(cpi_ctx)?;

    // Market PDA close happens automatically via Anchor's `close = creator` constraint
    Ok(())
}
```

### New Error Variants
```rust
// Source: Existing errors.rs pattern
#[error_code]
pub enum AvenirError {
    // Existing
    #[msg("Invalid USDC mint address")]
    InvalidMint,
    #[msg("Unauthorized: caller is not the admin")]
    Unauthorized,
    #[msg("Market is not in Open state")]
    MarketNotOpen,
    #[msg("Invalid category value (must be 0-4)")]
    InvalidCategory,
    #[msg("Question exceeds maximum length of 200 characters")]
    QuestionTooLong,

    // New for Phase 2
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Creator is not whitelisted")]
    CreatorNotWhitelisted,
    #[msg("Market deadline must be at least 1 hour in the future")]
    DeadlineTooSoon,
    #[msg("Resolution source cannot be empty")]
    EmptyResolutionSource,
    #[msg("Question cannot be empty")]
    EmptyQuestion,
    #[msg("Market has bets and cannot be cancelled")]
    MarketHasBets,
}
```

### Test Pattern: Create Market
```typescript
// Source: Existing test pattern in tests/avenir.ts
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";

// Derive whitelist PDA
const [whitelistPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("whitelist"), creator.publicKey.toBuffer()],
  program.programId
);

// Derive market PDA (market_counter + 1 = 1 for first market)
const marketId = new anchor.BN(1);
const [marketPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
  program.programId
);

// Derive vault PDA
const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), marketId.toArrayLike(Buffer, "le", 8)],
  program.programId
);

// Create market
const tx = await program.methods
  .createMarket({
    question: "Will ETH reach $10,000 by end of 2026?",
    resolutionSource: "https://coinmarketcap.com/currencies/ethereum/",
    category: 1, // Crypto
    resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400), // 24h from now
  })
  .accounts({
    creator: creator.publicKey,
    config: configPda,
    whitelist: whitelistPda,
    market: marketPda,
    marketVault: vaultPda,
    usdcMint: usdcMintAddress,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Passing Clock as Sysvar account | `Clock::get()` in handler | Solana 1.8+ | Saves 1 account in instruction, cheaper compute |
| Manual space calculation for accounts | `#[derive(InitSpace)]` with `#[max_len]` | Anchor 0.28+ | Auto-calculated, no manual byte counting |
| `init_if_needed` for conditional creation | Separate init + mut instructions | Anchor security advisory | `init_if_needed` has reentrancy risks if not careful; explicit patterns are safer |
| String storage on-chain | Still strings, but prefer fixed-size when possible | Ongoing | Variable-length strings add 4-byte prefix; `#[max_len]` ensures allocation |

**Deprecated/outdated:**
- `Sysvar<'info, Clock>` as an account: Still works but `Clock::get()` is preferred (cheaper, fewer accounts)
- Manual `Pubkey::find_program_address` for PDA verification: Anchor `seeds` + `bump` constraints handle this automatically

## Open Questions

1. **Resolution source max length: 128 bytes vs 256 bytes**
   - What we know: URLs typically 50-100 bytes. 128 bytes covers any practical URL or short reference. 256 would add ~128 bytes to every Market account (~0.001 SOL extra rent).
   - What's unclear: Whether users might need longer reference descriptions (e.g., multi-source references).
   - Recommendation: **128 bytes.** Sufficient for any URL. If multi-source needed, resolution_source can reference a page that lists multiple sources. Keeps rent low. This is within Claude's discretion per CONTEXT.md.

2. **Minimum deadline duration: 1 hour**
   - What we know: CONTEXT.md says "must be reasonable, e.g., 1h minimum". 3600 seconds gives ample buffer against clock drift.
   - What's unclear: Whether shorter durations (e.g., 15 minutes for flash markets) would be useful.
   - Recommendation: **1 hour (3600 seconds).** Reasonable minimum, prevents accidental near-instant markets, aligns with CONTEXT.md suggestion. This is within Claude's discretion.

3. **Whitelist removal: close PDA vs set active=false**
   - What we know: CONTEXT.md specifies "active flag" which implies keeping the PDA. But closing returns rent to admin and `init` works cleanly for re-add.
   - What's unclear: Whether there's a need to distinguish "never whitelisted" from "previously whitelisted".
   - Recommendation: **Close PDA on removal** (use `close = admin`). Simpler model: PDA exists = whitelisted, PDA doesn't exist = not whitelisted. Admin gets rent back. Re-adding uses `init` again. The `active` field is technically unnecessary in this model but keeping it provides a future migration path if needed. Keep the field but always set to `true`; removal closes the account.

## Sources

### Primary (HIGH confidence)
- [Anchor Account Constraints Reference](https://www.anchor-lang.com/docs/references/account-constraints) - init, seeds, bump, has_one, close, constraint, token::mint, token::authority syntax
- [Anchor Create Token Account](https://www.anchor-lang.com/docs/tokens/basics/create-token-account) - PDA-owned token account initialization pattern
- [Anchor PDA Guide](https://www.anchor-lang.com/docs/basics/pda) - PDA derivation, seeds, bump validation
- [Solana PDA Documentation](https://solana.com/docs/core/pda) - Core PDA concepts, canonical bump
- [RareSkills Solana Clock](https://rareskills.io/post/solana-clock) - Clock::get(), unix_timestamp, i64 type, slot-level timing
- [RareSkills Close Accounts](https://rareskills.io/post/solana-close-account) - Anchor close constraint, rent reclaim, exit handler behavior

### Secondary (MEDIUM confidence)
- [Prediction Market on Solana (DEV.to)](https://dev.to/sivarampg/building-a-prediction-market-on-solana-with-anchor-complete-rust-smart-contract-guide-3pbo) - Market creation pattern, vault init, counter-based IDs
- [Anchor Escrow Pattern](https://hackmd.io/@ironaddicteddog/anchor_example_escrow) - Cancel instruction with vault token account closure via CPI
- [Helius Anchor Security Guide](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security) - Access control patterns, authentication as #1 exploit vector
- [Solana Whitelist Program](https://github.com/davidtranhq/solana-whitelist) - Reference implementation of PDA-based whitelisting

### Tertiary (LOW confidence)
- Clock timestamp drift bounds (25% fast / 150% slow): Documented in Solana validator docs but exact real-world drift magnitude not independently measured. Treat 1-2 second drift as practical assumption.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in Cargo.toml from Phase 1; no new crates needed
- Architecture: HIGH - Every pattern uses established Anchor idioms verified against official docs; prediction market pattern closely matches an existing tutorial
- Pitfalls: HIGH - PDA seed ordering, counter increment, clock drift, and token account close ordering are well-documented failure modes with clear mitigations
- Code examples: HIGH - Patterns derived from existing codebase (Phase 1) + official Anchor documentation; cancel_market CPI pattern verified against escrow example

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days -- Anchor 0.32.1 is stable, no breaking changes expected)
