use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AvenirError;
use crate::state::{Market, UserPosition};

/// Claim payout from a finalized prediction market.
///
/// After compute_payouts reveals pool totals (Market state=Finalized), each winner
/// calls claim_payout to receive their proportional share of the total pool minus
/// the protocol fee.
///
/// Payout formula (plaintext math, no MPC):
///   total_pool    = revealed_yes_pool + revealed_no_pool
///   winning_pool  = revealed_yes_pool if winning_outcome==1, else revealed_no_pool
///   gross_payout  = user_winning_amount * total_pool / winning_pool
///   fee           = gross_payout * config_fee_bps / 10_000
///   net_payout    = gross_payout - fee
pub fn handler(ctx: Context<ClaimPayout>) -> Result<()> {
    // 1. Validate market is Finalized (state == 4)
    let market = &ctx.accounts.market;
    require!(market.state == 4, AvenirError::MarketNotFinalized);

    // 2. Validate position has not already been claimed
    let position = &ctx.accounts.user_position;
    require!(!position.claimed, AvenirError::AlreadyClaimed);

    // 3. Determine user's winning amount
    let user_winning_amount = if market.winning_outcome == 1 {
        position.yes_amount
    } else {
        position.no_amount
    };

    // 4. Reject if user has no winning position
    require!(user_winning_amount > 0, AvenirError::NoWinningPosition);

    // 5. Compute payout using u128 intermediate arithmetic (overflow prevention)
    let total_pool = market
        .revealed_yes_pool
        .checked_add(market.revealed_no_pool)
        .ok_or(AvenirError::MathOverflow)?;

    let winning_pool = if market.winning_outcome == 1 {
        market.revealed_yes_pool
    } else {
        market.revealed_no_pool
    };

    let gross_payout = (user_winning_amount as u128)
        .checked_mul(total_pool as u128)
        .ok_or(AvenirError::MathOverflow)?
        .checked_div(winning_pool as u128)
        .ok_or(AvenirError::MathOverflow)? as u64;

    let fee = (gross_payout as u128)
        .checked_mul(market.config_fee_bps as u128)
        .ok_or(AvenirError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(AvenirError::MathOverflow)? as u64;

    let net_payout = gross_payout
        .checked_sub(fee)
        .ok_or(AvenirError::MathOverflow)?;

    // 6. Extract Copy values before CPI to satisfy borrow checker
    let market_id = market.id;
    let bump = market.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[b"market", &market_id.to_le_bytes(), &[bump]]];

    // 7. Transfer net_payout: vault -> winner
    let payout_accounts = Transfer {
        from: ctx.accounts.market_vault.to_account_info(),
        to: ctx.accounts.winner_token_account.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            payout_accounts,
            signer_seeds,
        ),
        net_payout,
    )?;

    // 8. Transfer fee: vault -> fee_recipient (only if fee > 0)
    if fee > 0 {
        let fee_accounts = Transfer {
            from: ctx.accounts.market_vault.to_account_info(),
            to: ctx.accounts.fee_recipient_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                fee_accounts,
                signer_seeds,
            ),
            fee,
        )?;
    }

    // 9. Mark position as claimed (after both CPIs succeed)
    let position = &mut ctx.accounts.user_position;
    position.claimed = true;

    msg!(
        "claim_payout complete - winner={}, gross={}, fee={}, net={}, market_id={}",
        ctx.accounts.winner.key(),
        gross_payout,
        fee,
        net_payout,
        market_id,
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    pub winner: Signer<'info>,

    #[account(
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"position", market.id.to_le_bytes().as_ref(), winner.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.user == winner.key(),
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        mut,
        seeds = [b"vault", market.id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = winner,
    )]
    pub winner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = usdc_mint,
        constraint = fee_recipient_token_account.owner == market.config_fee_recipient,
    )]
    pub fee_recipient_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
