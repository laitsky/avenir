use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AvenirError;
use crate::state::{Config, Resolver};

/// Minimum resolver stake: 500 USDC (6 decimals)
pub const MIN_RESOLVER_STAKE: u64 = 500_000_000;

pub fn handler(ctx: Context<RegisterResolver>, amount: u64) -> Result<()> {
    // Validate minimum stake
    require!(amount >= MIN_RESOLVER_STAKE, AvenirError::StakeTooLow);

    // Transfer USDC from user token account to resolver vault
    let transfer_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.resolver_vault.to_account_info(),
        authority: ctx.accounts.resolver_wallet.to_account_info(),
    };
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        ),
        amount,
    )?;

    // Initialize resolver account
    let resolver = &mut ctx.accounts.resolver;
    resolver.wallet = ctx.accounts.resolver_wallet.key();
    resolver.staked_amount = amount;
    resolver.approved = false;
    resolver.active_disputes = 0;
    resolver.withdrawal_requested_at = 0;
    resolver.withdrawal_amount = 0;
    resolver.bump = ctx.bumps.resolver;
    resolver.vault_bump = ctx.bumps.resolver_vault;

    msg!(
        "Resolver registered - wallet={}, stake={}",
        resolver.wallet,
        amount
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterResolver<'info> {
    #[account(mut)]
    pub resolver_wallet: Signer<'info>,

    #[account(
        init,
        payer = resolver_wallet,
        space = 8 + Resolver::INIT_SPACE,
        seeds = [b"resolver", resolver_wallet.key().as_ref()],
        bump,
    )]
    pub resolver: Account<'info, Resolver>,

    #[account(
        init,
        payer = resolver_wallet,
        token::mint = usdc_mint,
        token::authority = resolver,
        seeds = [b"resolver_vault", resolver_wallet.key().as_ref()],
        bump,
    )]
    pub resolver_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = resolver_wallet,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        address = config.usdc_mint @ AvenirError::InvalidMint,
    )]
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
