use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::{AvenirError, ErrorCode};
use crate::state::{Market, MarketPool, UserPosition};
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::mpc::update_pool_callback::UpdatePoolCallback;

/// Place a bet on a prediction market.
///
/// This instruction atomically:
/// 1. Validates bet amount (>= 1 USDC), market state (Open), deadline, and lock status
/// 2. Handles stale lock timeout recovery (refunds stuck bettor if lock > 60s old)
/// 3. Validates side consistency (cannot bet on opposite side of existing position)
/// 4. Transfers USDC from user to market vault
/// 5. Pre-creates UserPosition PDA via init_if_needed (Arcium callbacks cannot create accounts)
/// 6. Stores pending bet data on Market for callback to reference
/// 7. Queues the update_pool MPC computation with extended callback accounts
pub fn handler(
    ctx: Context<PlaceBet>,
    amount: u64,
    is_yes: bool,
    computation_offset: u64,
    is_yes_ciphertext: [u8; 32],
    amount_ciphertext: [u8; 32],
    pub_key: [u8; 32],
    nonce: u128,
) -> Result<()> {
    // 1. Get clock
    let clock = Clock::get()?;

    // 2. Validate bet amount (minimum 1 USDC = 1,000,000 token units)
    require!(amount >= 1_000_000, AvenirError::BetTooSmall);

    let market = &mut ctx.accounts.market;

    // 3. Validate market state
    require!(market.state == 0, AvenirError::MarketNotOpen);

    // 4. Validate deadline
    require!(
        clock.unix_timestamp < market.resolution_time,
        AvenirError::MarketExpired
    );

    // 5. Check lock with timeout recovery
    if market.mpc_lock {
        if clock.unix_timestamp - market.lock_timestamp > 60 {
            // Lock is stale (>60s) -- refund the stuck bettor
            let market_id = market.id;
            let bump = market.bump;
            let signer_seeds: &[&[&[u8]]] =
                &[&[b"market", &market_id.to_le_bytes(), &[bump]]];

            // Deserialize pending_bettor_token_account as TokenAccount for refund
            let pending_token_info = ctx.accounts.pending_bettor_token_account.to_account_info();

            let refund_accounts = Transfer {
                from: ctx.accounts.market_vault.to_account_info(),
                to: pending_token_info,
                authority: market.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    refund_accounts,
                    signer_seeds,
                ),
                market.pending_amount,
            )?;

            // Clear lock state
            market.mpc_lock = false;
            market.pending_bettor = Pubkey::default();
            market.pending_amount = 0;
            market.pending_is_yes = false;
            market.lock_timestamp = 0;
        } else {
            // Lock is active -- reject immediately
            return Err(AvenirError::MpcLocked.into());
        }
    }

    // 6. Validate side consistency
    let user_position = &ctx.accounts.user_position;
    if user_position.yes_amount > 0 && !is_yes {
        return Err(AvenirError::WrongSide.into());
    }
    if user_position.no_amount > 0 && is_yes {
        return Err(AvenirError::WrongSide.into());
    }

    // 7. Transfer USDC: user -> vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.market_vault.to_account_info(),
        authority: ctx.accounts.bettor.to_account_info(),
    };
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        ),
        amount,
    )?;

    // 8. Store pending bet data on Market
    market.pending_bettor = ctx.accounts.bettor.key();
    market.pending_amount = amount;
    market.pending_is_yes = is_yes;
    market.mpc_lock = true;
    market.lock_timestamp = clock.unix_timestamp;

    // 9. Build ArgBuilder and queue MPC computation
    let args = ArgBuilder::new()
        .x25519_pubkey(pub_key)
        .plaintext_u128(nonce)
        .encrypted_bool(is_yes_ciphertext)
        .encrypted_u64(amount_ciphertext)
        .account(
            ctx.accounts.market_pool.key(),
            16, // offset: 8 (discriminator) + 8 (market_id)
            64, // length: 32 (yes_pool) + 32 (no_pool)
        )
        .build();

    // 10. Build extended CallbackAccount vector
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

    // 11. Build callback instruction and queue computation
    let callback_ixs = vec![UpdatePoolCallback::callback_ix(
        computation_offset,
        &ctx.accounts.mxe_account,
        &callback_accounts,
    )?];

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        callback_ixs,
        1,
        0,
    )?;

    Ok(())
}

#[queue_computation_accounts("update_pool", bettor)]
#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    /// The Market account -- validates state, deadline, lock, stores pending bet data.
    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// The MarketPool PDA containing encrypted pool state.
    #[account(
        seeds = [b"market_pool", market_pool.market_id.to_le_bytes().as_ref()],
        bump = market_pool.bump,
        constraint = market_pool.market_id == market.id,
    )]
    pub market_pool: Account<'info, MarketPool>,

    /// Per-user, per-market position tracking.
    /// Created via init_if_needed because Arcium callbacks cannot create accounts.
    #[account(
        init_if_needed,
        payer = bettor,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"position", market.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
        bump,
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Bettor's USDC token account (source for bet transfer).
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = bettor,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Market vault token account (destination for bet transfer).
    #[account(
        mut,
        seeds = [b"vault", market.id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    /// CHECK: Only used for timeout refund -- validated against market.pending_bettor
    /// when timeout recovery triggers. When no timeout, this account is unused.
    #[account(mut)]
    pub pending_bettor_token_account: UncheckedAccount<'info>,

    /// USDC mint for token account constraints.
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    // Arcium MPC accounts (injected by queue_computation_accounts macro)
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(
        mut,
        address = derive_sign_pda!()
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, derived from cluster
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, derived from cluster
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: computation_account, initialized by arcium
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(comp_def_offset("update_pool"))
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,

    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub arcium_program: Program<'info, Arcium>,
}
