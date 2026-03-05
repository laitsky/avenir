use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::ErrorCode;
use crate::state::MarketPool;
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::init_pool_callback::InitPoolCallback;

/// Queue an init_pool MPC computation to initialize encrypted pool state.
///
/// This instruction MUST be called after create_market to populate the MarketPool
/// PDA with valid MXE-encrypted zeros. Without this, update_pool will fail because
/// the pool ciphertext is not valid MXE-encrypted data.
///
/// The init_pool circuit takes no user inputs (just Mxe) and returns
/// Enc<Mxe, PoolTotals> -- two encrypted zeros for [yes_pool, no_pool].
pub fn handler(
    ctx: Context<InitPool>,
    computation_offset: u64,
) -> Result<()> {
    // init_pool takes no user inputs -- just initializes encrypted zeros
    let args = ArgBuilder::new().build();

    // Build callback instruction with MarketPool as a writable account
    let callback_accounts = vec![CallbackAccount {
        pubkey: ctx.accounts.market_pool.key(),
        is_writable: true,
    }];

    let callback_ixs = vec![InitPoolCallback::callback_ix(
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

#[queue_computation_accounts("init_pool", payer)]
#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The MarketPool PDA that will receive the encrypted pool state in the callback.
    /// Must already be initialized by create_market.
    #[account(
        seeds = [b"market_pool", market_pool.market_id.to_le_bytes().as_ref()],
        bump = market_pool.bump,
    )]
    pub market_pool: Account<'info, MarketPool>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(
        mut,
        address = derive_sign_pda!()
    )]
    pub sign_pda_account: Box<Account<'info, ArciumSignerAccount>>,

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
        address = derive_comp_def_pda!(comp_def_offset("init_pool"))
    )]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Box<Account<'info, Cluster>>,

    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Box<Account<'info, FeePool>>,

    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Box<Account<'info, ClockAccount>>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}
