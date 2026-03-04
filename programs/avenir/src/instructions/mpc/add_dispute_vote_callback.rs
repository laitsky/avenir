use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

use crate::errors::ErrorCode;
use crate::state::{Dispute, DisputeTally};
use crate::{ID, ID_CONST};

#[callback_accounts("add_dispute_vote")]
#[derive(Accounts)]
pub struct AddDisputeVoteCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(comp_def_offset("add_dispute_vote"))
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

    /// The DisputeTally PDA to write updated encrypted vote state into.
    #[account(mut)]
    pub dispute_tally: Account<'info, DisputeTally>,

    /// The Dispute PDA to clear mpc_lock on completion.
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
}
