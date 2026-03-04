use anchor_lang::prelude::*;

use crate::errors::AvenirError;
use crate::state::{Dispute, DisputeTally, Market, ResolverRegistry, Resolver, UserPosition};

/// Grace period duration in seconds (48 hours)
const GRACE_PERIOD: i64 = 172_800;
/// Voting window duration in seconds (48 hours)
const VOTING_WINDOW: i64 = 172_800;
/// Number of jurors to select
const JUROR_COUNT: usize = 7;
/// Initial quorum requirement (5 of 7)
const INITIAL_QUORUM: u8 = 5;

pub fn handler<'info>(ctx: Context<'_, '_, 'info, 'info, OpenDispute<'info>>) -> Result<()> {
    let clock = Clock::get()?;
    let market = &ctx.accounts.market;
    let user_position = &ctx.accounts.user_position;
    let resolver_registry = &ctx.accounts.resolver_registry;

    // 1. Validate caller is a market participant (has placed at least one bet)
    require!(
        user_position.yes_amount > 0 || user_position.no_amount > 0,
        AvenirError::NotMarketParticipant
    );

    // 2. Validate market state is Open (not already resolved or disputed)
    require!(market.state == 0, AvenirError::MarketAlreadyDisputed);

    // 3. Validate grace period has expired (48h after resolution_time)
    let grace_deadline = market.resolution_time.checked_add(GRACE_PERIOD).unwrap();
    require!(
        clock.unix_timestamp > grace_deadline,
        AvenirError::GracePeriodNotExpired
    );

    // 4. Validate no MPC lock in flight
    require!(!market.mpc_lock, AvenirError::MpcLocked);

    // 5. Validate enough resolvers for jury selection
    let resolver_count = resolver_registry.resolvers.len();
    require!(
        resolver_count >= JUROR_COUNT,
        AvenirError::NotEnoughResolvers
    );

    // 6. Select 7 jurors deterministically using Fisher-Yates partial shuffle
    let seed = market.id ^ (clock.slot as u64);
    let mut available: Vec<usize> = (0..resolver_count).collect();
    let mut selected_indices: Vec<usize> = Vec::with_capacity(JUROR_COUNT);

    for i in 0..JUROR_COUNT {
        let remaining = available.len();
        // LCG-style hash for deterministic index selection
        let idx = ((seed
            .wrapping_add(i as u64)
            .wrapping_mul(6_364_136_223_846_793_005u64)
            .wrapping_add(1))
            % remaining as u64) as usize;
        selected_indices.push(available.remove(idx));
    }

    // Collect juror pubkeys from registry
    let jurors: Vec<Pubkey> = selected_indices
        .iter()
        .map(|&idx| resolver_registry.resolvers[idx])
        .collect();

    // 7. Read stake snapshots from remaining_accounts (Resolver PDAs) and increment active_disputes
    let remaining_accounts = &ctx.remaining_accounts;
    require!(
        remaining_accounts.len() >= JUROR_COUNT,
        AvenirError::NotEnoughResolvers
    );

    let mut juror_stakes: Vec<u64> = Vec::with_capacity(JUROR_COUNT);

    for (i, juror_pubkey) in jurors.iter().enumerate() {
        let resolver_account_info = &remaining_accounts[i];

        // Validate PDA seeds match the expected resolver
        let (expected_pda, _bump) = Pubkey::find_program_address(
            &[b"resolver", juror_pubkey.as_ref()],
            ctx.program_id,
        );
        require!(
            resolver_account_info.key() == expected_pda,
            AvenirError::NotMarketParticipant // Reuse error -- invalid resolver account
        );

        // Deserialize, snapshot stake, increment active_disputes
        let mut resolver_data = resolver_account_info.try_borrow_mut_data()?;
        let mut resolver: Resolver =
            Resolver::try_deserialize(&mut resolver_data.as_ref())?;

        juror_stakes.push(resolver.staked_amount);
        resolver.active_disputes = resolver.active_disputes.checked_add(1).unwrap();

        // Re-serialize the updated resolver back
        let mut writer = resolver_data.as_mut();
        resolver.try_serialize(&mut writer)?;
    }

    // 8. Initialize Dispute PDA
    let dispute = &mut ctx.accounts.dispute;
    dispute.market_id = market.id;
    dispute.status = 0; // Voting
    dispute.jurors = jurors;
    dispute.juror_stakes = juror_stakes;
    dispute.votes_submitted = 0;
    dispute.vote_count = 0;
    dispute.quorum = INITIAL_QUORUM;
    dispute.voting_start = clock.unix_timestamp;
    dispute.voting_end = clock.unix_timestamp.checked_add(VOTING_WINDOW).unwrap();
    dispute.tiebreaker_added = false;
    dispute.escalator = ctx.accounts.escalator.key();
    dispute.mpc_lock = false;
    dispute.lock_timestamp = 0;
    dispute.bump = ctx.bumps.dispute;
    dispute.tally_bump = ctx.bumps.dispute_tally;

    // 9. Initialize DisputeTally PDA (encrypted fields zeroed, MPC will init later)
    let dispute_tally = &mut ctx.accounts.dispute_tally;
    dispute_tally.market_id = market.id;
    dispute_tally.yes_votes_encrypted = [0u8; 32];
    dispute_tally.no_votes_encrypted = [0u8; 32];
    dispute_tally.nonce = 0;
    dispute_tally.bump = ctx.bumps.dispute_tally;

    // 10. Transition market state to Disputed (3)
    let market = &mut ctx.accounts.market;
    market.state = 3;

    msg!(
        "Market {} dispute opened - 7 jurors selected, voting ends at {}",
        market.id,
        dispute.voting_end
    );

    Ok(())
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    /// The market participant escalating to dispute (pays for PDA creation)
    #[account(mut)]
    pub escalator: Signer<'info>,

    /// The market being disputed
    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// Caller's position on this market (proves they are a participant)
    #[account(
        seeds = [b"position", market.id.to_le_bytes().as_ref(), escalator.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.user == escalator.key() @ AvenirError::NotMarketParticipant,
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Registry of approved resolvers (read-only, for juror selection)
    #[account(
        seeds = [b"resolver_registry"],
        bump = resolver_registry.bump,
    )]
    pub resolver_registry: Account<'info, ResolverRegistry>,

    /// Dispute PDA to be created
    #[account(
        init,
        payer = escalator,
        space = 8 + Dispute::INIT_SPACE,
        seeds = [b"dispute", market.id.to_le_bytes().as_ref()],
        bump,
    )]
    pub dispute: Account<'info, Dispute>,

    /// DisputeTally PDA to be created (fixed-layout for MPC)
    #[account(
        init,
        payer = escalator,
        space = 8 + DisputeTally::INIT_SPACE,
        seeds = [b"dispute_tally", market.id.to_le_bytes().as_ref()],
        bump,
    )]
    pub dispute_tally: Account<'info, DisputeTally>,

    pub system_program: Program<'info, System>,
}
