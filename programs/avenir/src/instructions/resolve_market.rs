use anchor_lang::prelude::*;

use crate::errors::AvenirError;
use crate::state::Market;

pub fn handler(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Validate market state is Open
    require!(market.state == 0, AvenirError::MarketNotOpen);

    // Validate deadline has passed
    require!(
        clock.unix_timestamp >= market.resolution_time,
        AvenirError::MarketNotExpired
    );

    // Validate within 48-hour grace period (172800 seconds)
    // After this window, the market must be resolved via dispute escalation
    let grace_deadline = market
        .resolution_time
        .checked_add(172_800)
        .ok_or(AvenirError::MathOverflow)?;
    require!(
        clock.unix_timestamp <= grace_deadline,
        AvenirError::GracePeriodExpired
    );

    // Validate no MPC in flight
    require!(!market.mpc_lock, AvenirError::MpcLocked);

    // Validate winning outcome (1=Yes, 2=No)
    require!(
        winning_outcome == 1 || winning_outcome == 2,
        AvenirError::InvalidOutcome
    );

    // Set resolution state: Open(0) -> Resolved(2)
    market.state = 2;
    market.winning_outcome = winning_outcome;

    msg!(
        "Market {} resolved - winning_outcome={}",
        market.id,
        winning_outcome
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.creator == creator.key() @ AvenirError::NotMarketCreator,
    )]
    pub market: Account<'info, Market>,
}
