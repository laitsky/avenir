use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::{AvenirError, ErrorCode};
use crate::state::{Market, MarketPool};
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::compute_payouts_callback::ComputePayoutsCallback;

/// Queue a compute_payouts MPC computation on a Resolved market.
///
/// This instruction:
/// 1. Validates market.state == 2 (Resolved)
/// 2. Checks mpc_lock with 60s timeout recovery (no refund needed -- no user funds held)
/// 3. Sets mpc_lock and lock_timestamp
/// 4. Builds ArgBuilder with account-only read (no user-encrypted input)
/// 5. Queues the computation with a callback to compute_payouts_callback
///
/// The compute_payouts circuit takes only Enc<Mxe, PoolTotals> from MarketPool
/// and reveals both pool totals as plaintext u64 values.
pub fn handler(ctx: Context<ComputePayouts>, computation_offset: u64) -> Result<()> {
    let clock = Clock::get()?;
    let market = &mut ctx.accounts.market;

    // 1. Validate market is in Resolved state (state == 2)
    require!(market.state == 2, AvenirError::MarketNotResolved);

    // 2. Check mpc_lock with timeout recovery
    if market.mpc_lock {
        if clock.unix_timestamp - market.lock_timestamp > 60 {
            // Lock is stale (>60s) -- clear it and continue.
            // No refund needed since compute_payouts doesn't hold user funds.
            market.mpc_lock = false;
            market.lock_timestamp = 0;
        } else {
            // Lock is active -- reject
            return Err(AvenirError::MpcLocked.into());
        }
    }

    // 3. Set mpc_lock
    market.mpc_lock = true;
    market.lock_timestamp = clock.unix_timestamp;

    // 4. Build ArgBuilder with ONLY .account() -- no x25519_pubkey, no encrypted args.
    // compute_payouts circuit takes only Enc<Mxe, PoolTotals> from MarketPool.
    //
    // MarketPool byte layout:
    //   8 bytes: Anchor discriminator
    //   8 bytes: market_id (u64)
    //   32 bytes: yes_pool_encrypted [u8; 32]
    //   32 bytes: no_pool_encrypted [u8; 32]
    //   = offset 16, length 64 for the two ciphertexts
    let args = ArgBuilder::new()
        .account(ctx.accounts.market_pool.key(), 16, 64)
        .build();

    // 5. Build callback_accounts -- ONLY the Market account (writable)
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

#[queue_computation_accounts("compute_payouts", payer)]
#[derive(Accounts)]
pub struct ComputePayouts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Market account -- validates Resolved state, manages mpc_lock.
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

    // Standard Arcium accounts for queue_computation
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
        address = derive_comp_def_pda!(comp_def_offset("compute_payouts"))
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
