use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

use crate::errors::ErrorCode;
use crate::state::{Market, MarketPool};
use crate::{ID, ID_CONST};

#[callback_accounts("update_pool")]
#[derive(Accounts)]
pub struct UpdatePoolCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(comp_def_offset("update_pool"))
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account, verified by arcium
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,

    /// The MarketPool PDA to write updated encrypted pool state into.
    #[account(mut)]
    pub market_pool: Account<'info, MarketPool>,

    /// The Market account to update sentiment, mpc_lock, and total_bets.
    #[account(mut)]
    pub market: Account<'info, Market>,
}
