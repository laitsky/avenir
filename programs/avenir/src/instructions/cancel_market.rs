use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount};

use crate::errors::AvenirError;
use crate::state::{Config, Market};

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = !config.paused @ AvenirError::ProtocolPaused,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        has_one = creator @ AvenirError::Unauthorized,
        constraint = market.total_bets == 0 @ AvenirError::MarketHasBets,
        close = creator,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"vault", market.id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelMarket>) -> Result<()> {
    // Close the vault token account via CPI FIRST
    // (Market PDA still exists as signer authority at this point)
    // Anchor's `close = creator` runs AFTER the handler returns
    let market_id = ctx.accounts.market.id;
    let bump = ctx.accounts.market.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"market",
        &market_id.to_le_bytes(),
        &[bump],
    ]];

    let cpi_accounts = CloseAccount {
        account: ctx.accounts.market_vault.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::close_account(cpi_ctx)?;

    // Market PDA close happens automatically via Anchor's `close = creator` on exit
    Ok(())
}
