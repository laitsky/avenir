use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::{AvenirError, ErrorCode};
use crate::state::{Dispute, DisputeTally, Market, Resolver};
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::mpc::add_dispute_vote_callback::AddDisputeVoteCallback;

/// Cast a vote on an active dispute as a selected juror.
///
/// This instruction atomically:
/// 1. Validates dispute is in Voting state
/// 2. Validates voting window is still open
/// 3. Validates caller is a selected juror
/// 4. Validates juror hasn't already voted (bitfield check)
/// 5. Checks MPC lock with 60s timeout recovery
/// 6. Sets MPC lock on dispute
/// 7. Marks juror as having voted (bitfield set)
/// 8. Increments vote_count
/// 9. Reads stake weight from Resolver account
/// 10. Queues add_dispute_vote MPC computation
pub fn handler(
    ctx: Context<CastVote>,
    computation_offset: u64,
    vote_ciphertext: [u8; 32],
    pub_key: [u8; 32],
    nonce: u128,
) -> Result<()> {
    let clock = Clock::get()?;

    // Read stake weight from Resolver account before mutable borrow
    let stake_weight = ctx.accounts.resolver.staked_amount;
    let juror_key = ctx.accounts.juror.key();

    // Extract Copy values needed after mutable borrow via scoped block
    let (market_id, vote_count) = {
        let dispute = &mut ctx.accounts.dispute;

        // 1. Validate dispute status == 0 (Voting)
        require!(dispute.status == 0, AvenirError::DisputeNotVoting);

        // 2. Validate voting window
        require!(
            clock.unix_timestamp <= dispute.voting_end,
            AvenirError::VotingWindowClosed
        );

        // 3. Validate caller is a selected juror and get index
        let juror_index = dispute
            .jurors
            .iter()
            .position(|j| *j == juror_key)
            .ok_or(AvenirError::NotSelectedJuror)?;

        // 4. Validate juror hasn't already voted (bitfield check)
        require!(
            (dispute.votes_submitted >> juror_index) & 1 == 0,
            AvenirError::AlreadyVoted
        );

        // 5. Check MPC lock with 60s timeout recovery
        if dispute.mpc_lock {
            if clock.unix_timestamp - dispute.lock_timestamp > 60 {
                // Lock is stale (>60s) -- clear it and continue.
                // No refund needed since voting doesn't hold user funds.
                dispute.mpc_lock = false;
                dispute.lock_timestamp = 0;
            } else {
                // Lock is active -- reject
                return Err(AvenirError::MpcLocked.into());
            }
        }

        // 6. Set MPC lock on dispute
        dispute.mpc_lock = true;
        dispute.lock_timestamp = clock.unix_timestamp;

        // 7. Mark juror as having voted (bitfield set)
        dispute.votes_submitted |= 1 << juror_index;

        // 8. Increment vote_count
        dispute.vote_count = dispute.vote_count.checked_add(1).unwrap();

        (dispute.market_id, dispute.vote_count)
    }; // mutable borrow of dispute ends here

    // 10. Build ArgBuilder and queue add_dispute_vote MPC computation
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

    msg!(
        "cast_vote: juror {} voted on dispute for market {}, vote_count={}",
        juror_key,
        market_id,
        vote_count
    );

    Ok(())
}

#[queue_computation_accounts("add_dispute_vote", juror)]
#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub juror: Signer<'info>,

    /// The Dispute PDA -- validates status, juror eligibility, voting window, MPC lock.
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

    /// The Market account -- validates state is Disputed (3).
    #[account(
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.id == dispute.market_id,
        constraint = market.state == 3,
    )]
    pub market: Account<'info, Market>,

    /// The Resolver PDA for the juror -- provides stake weight.
    #[account(
        seeds = [b"resolver", juror.key().as_ref()],
        bump = resolver.bump,
    )]
    pub resolver: Account<'info, Resolver>,

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
