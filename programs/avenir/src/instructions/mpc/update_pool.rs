/// NOTE: This instruction is superseded by `place_bet` for production use.
/// place_bet atomically transfers USDC + queues MPC. This standalone version
/// is retained for Phase 3 test compatibility.

use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::{AvenirError, ErrorCode};
use crate::state::{Market, MarketPool};
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::update_pool_callback::UpdatePoolCallback;

/// Queue an update_pool MPC computation when a user places a bet.
///
/// This instruction:
/// 1. Checks mpc_lock is not set (prevents concurrent MPC operations)
/// 2. Sets mpc_lock on the Market
/// 3. Builds ArgBuilder with encrypted bet input + on-chain pool ciphertext
/// 4. Queues the computation with a callback to update_pool_callback
///
/// The update_pool circuit takes:
/// - bet_ctxt: Enc<Shared, BetInput> (user's encrypted bet direction + amount)
/// - pool_ctxt: Enc<Mxe, PoolTotals> (current encrypted pool state from MarketPool)
///
/// IMPORTANT: init_pool must have completed successfully before calling update_pool.
/// If MarketPool still has zero-filled ciphertext (not MXE-encrypted), the MPC
/// computation will fail because the pool data is not valid encrypted state.
pub fn handler(
    ctx: Context<UpdatePool>,
    computation_offset: u64,
    is_yes_ciphertext: [u8; 32],
    amount_ciphertext: [u8; 32],
    pub_key: [u8; 32],
    nonce: u128,
) -> Result<()> {
    // Check mpc_lock -- prevent concurrent MPC operations on this market
    require!(!ctx.accounts.market.mpc_lock, AvenirError::MpcLocked);

    // Set mpc_lock before queuing computation
    ctx.accounts.market.mpc_lock = true;

    // Build arguments for the update_pool circuit:
    // Arg 1: Enc<Shared, BetInput> = x25519_pubkey + nonce + encrypted_bool(is_yes) + encrypted_u64(amount)
    // Arg 2: Enc<Mxe, PoolTotals> = account read from MarketPool at fixed byte offset
    //
    // MarketPool byte layout:
    //   8 bytes: Anchor discriminator
    //   8 bytes: market_id (u64)
    //   32 bytes: yes_pool_encrypted [u8; 32]
    //   32 bytes: no_pool_encrypted [u8; 32]
    //   = offset 16, length 64 for the two ciphertexts
    let args = ArgBuilder::new()
        .x25519_pubkey(pub_key)
        .plaintext_u128(nonce)
        .encrypted_bool(is_yes_ciphertext) // BetInput.is_yes
        .encrypted_u64(amount_ciphertext) // BetInput.amount
        .account(
            ctx.accounts.market_pool.key(),
            16, // offset: 8 (discriminator) + 8 (market_id)
            64, // length: 32 (yes_pool) + 32 (no_pool)
        )
        .build();

    // Build callback with 6 accounts matching UpdatePoolCallback struct ordering
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
            pubkey: ctx.accounts.bettor_token_account.key(),
            is_writable: true,
        },
        CallbackAccount {
            pubkey: ctx.accounts.token_program.key(),
            is_writable: false,
        },
    ];

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

#[queue_computation_accounts("update_pool", payer)]
#[derive(Accounts)]
pub struct UpdatePool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Market account -- used for mpc_lock check/set.
    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// The MarketPool PDA containing encrypted pool state.
    /// Must have been initialized by init_pool callback before update_pool is called.
    #[account(
        seeds = [b"market_pool", market_pool.market_id.to_le_bytes().as_ref()],
        bump = market_pool.bump,
        constraint = market_pool.market_id == market.id,
    )]
    pub market_pool: Account<'info, MarketPool>,

    /// UserPosition PDA (needed for callback account matching).
    /// CHECK: Passed through to callback -- not validated in standalone update_pool.
    #[account(mut)]
    pub user_position: UncheckedAccount<'info>,

    /// Market vault token account (needed for callback account matching).
    /// CHECK: Passed through to callback -- not validated in standalone update_pool.
    #[account(mut)]
    pub market_vault: UncheckedAccount<'info>,

    /// Bettor's token account (needed for callback account matching).
    /// CHECK: Passed through to callback -- not validated in standalone update_pool.
    #[account(mut)]
    pub bettor_token_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,

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

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}
