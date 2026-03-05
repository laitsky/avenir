use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::errors::{AvenirError, ErrorCode};
use crate::state::{Dispute, DisputeTally, Market};
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::finalize_dispute_callback::FinalizeDisputeCallback;

/// Queue a finalize_dispute MPC computation to reveal vote totals.
///
/// This instruction:
/// 1. Validates dispute.status == 0 (Voting) and vote_count >= quorum
/// 2. Checks MPC lock with 60s timeout recovery
/// 3. Sets MPC lock and transitions dispute to Finalizing (1)
/// 4. Builds ArgBuilder with account-only read (no user-encrypted input)
/// 5. Queues the computation with a callback to finalize_dispute_callback
///
/// The finalize_dispute circuit takes only Enc<Mxe, VoteTotals> from DisputeTally
/// and reveals both vote totals as plaintext u64 values.
pub fn handler(ctx: Context<FinalizeDispute>, computation_offset: u64) -> Result<()> {
    let clock = Clock::get()?;

    // Scoped mutable borrow to satisfy borrow checker before queue_computation
    {
        let dispute = &mut ctx.accounts.dispute;

        // 1. Validate dispute is in Voting state
        require!(dispute.status == 0, AvenirError::DisputeNotVoting);

        // 2. Validate quorum is reached
        require!(
            dispute.vote_count >= dispute.quorum,
            AvenirError::QuorumNotReached
        );

        // 3. Check MPC lock with 60s timeout recovery
        if dispute.mpc_lock {
            if clock.unix_timestamp - dispute.lock_timestamp > 60 {
                dispute.mpc_lock = false;
                dispute.lock_timestamp = 0;
            } else {
                return Err(AvenirError::MpcLocked.into());
            }
        }

        // 4. Set MPC lock
        dispute.mpc_lock = true;
        dispute.lock_timestamp = clock.unix_timestamp;

        // 5. Transition to Finalizing state
        dispute.status = 1;
    }

    // Build ArgBuilder with ONLY .account() -- no x25519_pubkey, no encrypted args.
    // finalize_dispute circuit takes only Enc<Mxe, VoteTotals> from DisputeTally.
    //
    // DisputeTally byte layout:
    //   8 bytes: Anchor discriminator
    //   8 bytes: market_id (u64)
    //   32 bytes: yes_votes_encrypted [u8; 32]
    //   32 bytes: no_votes_encrypted [u8; 32]
    //   = offset 16, length 64 for the two ciphertexts
    let args = ArgBuilder::new()
        .account(ctx.accounts.dispute_tally.key(), 16, 64)
        .build();

    // Build callback accounts: Market (writable), Dispute (writable)
    let callback_accounts = vec![
        CallbackAccount {
            pubkey: ctx.accounts.market.key(),
            is_writable: true,
        },
        CallbackAccount {
            pubkey: ctx.accounts.dispute.key(),
            is_writable: true,
        },
    ];

    let callback_ixs = vec![FinalizeDisputeCallback::callback_ix(
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

#[queue_computation_accounts("finalize_dispute", payer)]
#[derive(Accounts)]
pub struct FinalizeDispute<'info> {
    /// Anyone can trigger finalization once quorum is reached.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Dispute PDA -- validates status, quorum, MPC lock.
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
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.id == dispute.market_id,
        constraint = market.state == 3,
    )]
    pub market: Account<'info, Market>,

    // Standard Arcium accounts for queue_computation
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
        address = derive_comp_def_pda!(comp_def_offset("finalize_dispute"))
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
