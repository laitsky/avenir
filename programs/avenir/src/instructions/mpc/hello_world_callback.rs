use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

use crate::errors::ErrorCode;
use crate::{ID, ID_CONST};

#[callback_accounts("hello_world")]
#[derive(Accounts)]
pub struct HelloWorldCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(comp_def_offset("hello_world"))
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
}
