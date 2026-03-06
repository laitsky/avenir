use anchor_lang::prelude::*;

use crate::errors::AvenirError;
use crate::state::{Dispute, Market, Resolver, ResolverRegistry};

/// Add a tiebreaker juror to a dispute that ended in a tie.
///
/// Called when finalize_dispute detects a tie (dispute.status was reset to Voting by callback).
/// This instruction:
/// 1. Validates dispute.status == 0 (Voting) and tiebreaker_added == false
/// 2. Selects 1 additional juror from ResolverRegistry not already in dispute.jurors
/// 3. Pushes new juror pubkey and stake snapshot to dispute vectors
/// 4. Extends voting window by 24 hours
/// 5. Increments quorum by 1
/// 6. Sets tiebreaker_added = true
/// 7. Increments new resolver's active_disputes
pub fn handler<'info>(ctx: Context<'_, '_, 'info, 'info, AddTiebreaker<'info>>) -> Result<()> {
    let clock = Clock::get()?;
    let dispute = &mut ctx.accounts.dispute;

    // 1. Validate dispute is in Voting state (reset after tie)
    require!(dispute.status == 0, AvenirError::DisputeNotVoting);

    // 2. Validate tiebreaker not already added
    require!(
        !dispute.tiebreaker_added,
        AvenirError::TiebreakerAlreadyAdded
    );

    // 3. Select tiebreaker juror from registry using deterministic selection
    let registry = &ctx.accounts.resolver_registry;
    let seed = dispute
        .market_id
        .wrapping_mul(6364136223846793005)
        ^ (dispute.vote_count as u64);

    let registry_len = registry.resolvers.len() as u64;
    require!(registry_len > 0, AvenirError::NotEnoughResolvers);

    let mut selected_index: Option<usize> = None;
    for i in 0..registry_len {
        let candidate_idx = ((seed.wrapping_add(i)) % registry_len) as usize;
        let candidate = &registry.resolvers[candidate_idx];

        // Skip if already a juror
        if !dispute.jurors.contains(candidate) {
            selected_index = Some(candidate_idx);
            break;
        }
    }

    let selected_idx = selected_index.ok_or(AvenirError::NotEnoughResolvers)?;
    let new_juror_pubkey = registry.resolvers[selected_idx];

    // 4. Get resolver account from remaining accounts for stake snapshot + active_disputes
    let resolver_account_info = ctx
        .remaining_accounts
        .first()
        .ok_or(AvenirError::NotEnoughResolvers)?;

    // Validate the resolver PDA
    let (expected_pda, _bump) =
        Pubkey::find_program_address(&[b"resolver", new_juror_pubkey.as_ref()], ctx.program_id);
    require!(
        resolver_account_info.key() == expected_pda,
        AvenirError::NotSelectedJuror
    );

    let mut resolver_data = resolver_account_info.try_borrow_mut_data()?;
    let resolver =
        Resolver::try_deserialize(&mut resolver_data.as_ref()).map_err(|_| AvenirError::NotSelectedJuror)?;

    let stake_snapshot = resolver.staked_amount;

    // 5. Push new juror and stake
    dispute.jurors.push(new_juror_pubkey);
    dispute.juror_stakes.push(stake_snapshot);

    // 6. Extend voting window by 24 hours
    dispute.voting_end = clock.unix_timestamp + 86400;

    // 7. Increment quorum by 1
    dispute.quorum = dispute.quorum.checked_add(1).ok_or(AvenirError::MathOverflow)?;

    // 8. Set tiebreaker_added
    dispute.tiebreaker_added = true;

    // 9. Increment active_disputes on the new resolver
    let mut resolver = resolver;
    resolver.active_disputes = resolver
        .active_disputes
        .checked_add(1)
        .ok_or(AvenirError::MathOverflow)?;

    // Re-serialize the updated resolver back in-place (same pattern as open_dispute)
    let mut writer = resolver_data.as_mut();
    resolver
        .try_serialize(&mut writer)
        .map_err(|_| AvenirError::NotSelectedJuror)?;

    msg!(
        "add_tiebreaker: added juror {} to dispute for market {}, quorum now {}, voting_end={}",
        new_juror_pubkey,
        dispute.market_id,
        dispute.quorum,
        dispute.voting_end
    );

    Ok(())
}

#[derive(Accounts)]
pub struct AddTiebreaker<'info> {
    /// Anyone can trigger tiebreaker addition.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Dispute PDA -- validates status and tiebreaker state.
    #[account(
        mut,
        seeds = [b"dispute", dispute.market_id.to_le_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Account<'info, Dispute>,

    /// The Market account -- validates state is Disputed (3).
    #[account(
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.id == dispute.market_id,
        constraint = market.state == 3,
    )]
    pub market: Account<'info, Market>,

    /// The ResolverRegistry for juror selection.
    #[account(
        seeds = [b"resolver_registry"],
        bump = resolver_registry.bump,
    )]
    pub resolver_registry: Account<'info, ResolverRegistry>,
    // Remaining accounts: 1 Resolver PDA (the new juror)
}
