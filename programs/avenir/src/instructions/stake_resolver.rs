use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AvenirError;
use crate::state::{Config, Resolver};

pub fn handler(ctx: Context<StakeResolver>, amount: u64) -> Result<()> {
    // Validate resolver is approved
    let resolver = &ctx.accounts.resolver;
    require!(resolver.approved, AvenirError::ResolverNotApproved);

    // Transfer USDC from user to resolver vault
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

    // Increment staked amount
    let resolver = &mut ctx.accounts.resolver;
    resolver.staked_amount = resolver.staked_amount.checked_add(amount).unwrap();

    msg!(
        "Resolver stake topped up - wallet={}, added={}, total={}",
        resolver.wallet,
        amount,
        resolver.staked_amount
    );

    Ok(())
}

#[derive(Accounts)]
pub struct StakeResolver<'info> {
    #[account(mut)]
    pub resolver_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"resolver", resolver_wallet.key().as_ref()],
        bump = resolver.bump,
        constraint = resolver.wallet == resolver_wallet.key(),
    )]
    pub resolver: Account<'info, Resolver>,

    #[account(
        mut,
        seeds = [b"resolver_vault", resolver_wallet.key().as_ref()],
        bump = resolver.vault_bump,
        token::mint = usdc_mint,
        token::authority = resolver,
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

    pub token_program: Program<'info, Token>,
}
