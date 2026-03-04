use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::ErrorCode;
use crate::state::{Dispute, DisputeTally};
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::add_dispute_vote_callback::AddDisputeVoteCallback;

/// Queue an add_dispute_vote MPC computation to accumulate a juror's encrypted vote.
///
/// This instruction is called internally by cast_vote after all validation.
/// The add_dispute_vote circuit takes:
/// - vote_ctxt: Enc<Shared, VoteInput> (juror's encrypted vote direction)
/// - tally_ctxt: Enc<Mxe, VoteTotals> (current encrypted tally from DisputeTally)
/// - stake_weight: u64 (juror's staked amount, plaintext)
///
/// Returns updated encrypted tally (Mxe-owned).
pub fn handler(
    ctx: Context<AddDisputeVote>,
    computation_offset: u64,
    vote_ciphertext: [u8; 32],
    pub_key: [u8; 32],
    nonce: u128,
    stake_weight: u64,
) -> Result<()> {
    // Build arguments for the add_dispute_vote circuit:
    // Arg 1: Enc<Shared, VoteInput> = x25519_pubkey + nonce + encrypted_bool(is_yes)
    // Arg 2: Enc<Mxe, VoteTotals> = account read from DisputeTally at fixed byte offset
    // Arg 3: plaintext_u64(stake_weight) = juror's public stake weight
    //
    // DisputeTally byte layout:
    //   8 bytes: Anchor discriminator
    //   8 bytes: market_id (u64)
    //   32 bytes: yes_votes_encrypted [u8; 32]
    //   32 bytes: no_votes_encrypted [u8; 32]
    //   = offset 16, length 64 for the two ciphertexts
    let args = ArgBuilder::new()
        .x25519_pubkey(pub_key)
        .plaintext_u128(nonce)
        .encrypted_bool(vote_ciphertext) // VoteInput.is_yes
        .plaintext_u64(stake_weight) // Juror's public stake weight
        .account(
            ctx.accounts.dispute_tally.key(),
            16, // offset: 8 (discriminator) + 8 (market_id)
            64, // length: 32 (yes_votes) + 32 (no_votes)
        )
        .build();

    // Build callback with DisputeTally (writable) + Dispute (writable)
    let callback_accounts = vec![
        CallbackAccount {
            pubkey: ctx.accounts.dispute_tally.key(),
            is_writable: true,
        },
        CallbackAccount {
            pubkey: ctx.accounts.dispute.key(),
            is_writable: true,
        },
    ];

    let callback_ixs = vec![AddDisputeVoteCallback::callback_ix(
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

#[queue_computation_accounts("add_dispute_vote", juror)]
#[derive(Accounts)]
pub struct AddDisputeVote<'info> {
    #[account(mut)]
    pub juror: Signer<'info>,

    /// The Dispute PDA -- for callback account pass-through.
    #[account(
        mut,
        seeds = [b"dispute", dispute.market_id.to_le_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Account<'info, Dispute>,

    /// The DisputeTally PDA containing encrypted vote state.
    #[account(
        seeds = [b"dispute_tally", dispute_tally.market_id.to_le_bytes().as_ref()],
        bump = dispute_tally.bump,
        constraint = dispute_tally.market_id == dispute.market_id,
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
        address = derive_comp_def_pda!(comp_def_offset("add_dispute_vote"))
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
