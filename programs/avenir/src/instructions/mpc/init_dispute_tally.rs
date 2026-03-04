use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::{AvenirError, ErrorCode};
use crate::state::{Dispute, DisputeTally};
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::init_dispute_tally_callback::InitDisputeTallyCallback;

/// Queue an init_dispute_tally MPC computation to initialize encrypted vote state.
///
/// This instruction MUST be called after open_dispute to populate the DisputeTally
/// PDA with valid MXE-encrypted zeros. Without this, add_dispute_vote will fail because
/// the tally ciphertext is not valid MXE-encrypted data.
///
/// The init_dispute_tally circuit takes no user inputs (just Mxe) and returns
/// Enc<Mxe, VoteTotals> -- two encrypted zeros for [yes_votes, no_votes].
pub fn handler(
    ctx: Context<InitDisputeTally>,
    computation_offset: u64,
) -> Result<()> {
    // Validate dispute is in Voting state
    require!(ctx.accounts.dispute.status == 0, AvenirError::DisputeNotVoting);

    // init_dispute_tally takes no user inputs -- just initializes encrypted zeros
    let args = ArgBuilder::new().build();

    // Build callback instruction with DisputeTally as a writable account
    let callback_accounts = vec![CallbackAccount {
        pubkey: ctx.accounts.dispute_tally.key(),
        is_writable: true,
    }];

    let callback_ixs = vec![InitDisputeTallyCallback::callback_ix(
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

#[queue_computation_accounts("init_dispute_tally", payer)]
#[derive(Accounts)]
pub struct InitDisputeTally<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Dispute PDA -- validates status is Voting.
    #[account(
        seeds = [b"dispute", dispute.market_id.to_le_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Account<'info, Dispute>,

    /// The DisputeTally PDA that will receive the encrypted vote state in the callback.
    /// Must already be initialized by open_dispute.
    #[account(
        seeds = [b"dispute_tally", dispute_tally.market_id.to_le_bytes().as_ref()],
        bump = dispute_tally.bump,
    )]
    pub dispute_tally: Account<'info, DisputeTally>,

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
        address = derive_comp_def_pda!(comp_def_offset("init_dispute_tally"))
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
