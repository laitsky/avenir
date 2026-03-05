use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AvenirError;
use crate::state::{Config, Resolver, ResolverRegistry, MIN_RESOLVER_STAKE};

/// Withdrawal cooldown: 7 days in seconds
pub const WITHDRAWAL_COOLDOWN: i64 = 604_800;

pub fn handler(ctx: Context<WithdrawResolver>, amount: u64, execute: bool) -> Result<()> {
    let clock = Clock::get()?;

    if !execute {
        // === Request phase ===
        let resolver = &mut ctx.accounts.resolver;

        require!(amount > 0, AvenirError::MathOverflow);

        // Cannot withdraw while active in disputes
        require!(
            resolver.active_disputes == 0,
            AvenirError::ActiveDisputeExists
        );

        // Validate: remaining stake >= minimum OR full withdrawal
        require!(amount <= resolver.staked_amount, AvenirError::MathOverflow);
        let remaining = resolver
            .staked_amount
            .checked_sub(amount)
            .ok_or(AvenirError::MathOverflow)?;
        require!(
            remaining >= MIN_RESOLVER_STAKE || amount == resolver.staked_amount,
            AvenirError::InsufficientStake
        );

        // Set withdrawal request
        resolver.withdrawal_requested_at = clock.unix_timestamp;
        resolver.withdrawal_amount = amount;

        msg!(
            "Withdrawal requested - wallet={}, amount={}, cooldown_ends={}",
            resolver.wallet,
            amount,
            clock.unix_timestamp + WITHDRAWAL_COOLDOWN
        );
    } else {
        // === Execute phase ===
        let resolver = &ctx.accounts.resolver;

        // Validate there is a pending withdrawal
        require!(
            resolver.withdrawal_requested_at > 0,
            AvenirError::WithdrawalNotRequested
        );

        // Validate cooldown has elapsed
        require!(
            clock.unix_timestamp >= resolver.withdrawal_requested_at + WITHDRAWAL_COOLDOWN,
            AvenirError::CooldownNotElapsed
        );

        // Validate no active disputes (re-check at execute time)
        require!(
            resolver.active_disputes == 0,
            AvenirError::ActiveDisputeExists
        );

        let withdrawal_amount = resolver.withdrawal_amount;

        // Transfer USDC from resolver vault to user
        let resolver_wallet_key = ctx.accounts.resolver_wallet.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"resolver",
            resolver_wallet_key.as_ref(),
            &[resolver.bump],
        ]];

        let transfer_accounts = Transfer {
            from: ctx.accounts.resolver_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.resolver.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
                signer_seeds,
            ),
            withdrawal_amount,
        )?;

        // Update resolver state
        let resolver = &mut ctx.accounts.resolver;
        resolver.staked_amount = resolver
            .staked_amount
            .checked_sub(withdrawal_amount)
            .ok_or(AvenirError::MathOverflow)?;
        resolver.withdrawal_requested_at = 0;
        resolver.withdrawal_amount = 0;

        // If full withdrawal (stake now 0): revoke approval, remove from registry
        if resolver.staked_amount == 0 {
            resolver.approved = false;

            let registry = &mut ctx.accounts.resolver_registry;
            if let Some(pos) = registry.resolvers.iter().position(|k| *k == resolver.wallet) {
                registry.resolvers.swap_remove(pos);
            }

            msg!(
                "Resolver fully withdrawn and removed from registry - wallet={}",
                resolver.wallet
            );
        } else {
            msg!(
                "Withdrawal executed - wallet={}, withdrawn={}, remaining={}",
                resolver.wallet,
                withdrawal_amount,
                resolver.staked_amount
            );
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawResolver<'info> {
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
        mut,
        seeds = [b"resolver_registry"],
        bump = resolver_registry.bump,
    )]
    pub resolver_registry: Account<'info, ResolverRegistry>,

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
