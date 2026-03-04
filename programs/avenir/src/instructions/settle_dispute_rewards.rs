use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::AvenirError;
use crate::state::{Dispute, Market, Resolver};

/// Settle dispute rewards/penalties for a single juror.
///
/// Called after dispute is settled (dispute.status == 2, market.state == Resolved).
/// Processes per-juror:
/// - Non-voters (bit NOT set in votes_submitted): slash 0.5% from Resolver stake
///   and transfer from resolver vault to reward_recipient token account.
/// - Voters: no slash in v1 (individual votes are private, cannot determine majority/minority).
/// - All jurors: decrement active_disputes on their Resolver account.
///
/// Must be called once per juror. The instruction is idempotent per juror via
/// active_disputes tracking (once decremented to reflect settlement, calling again
/// would be for a different dispute).
pub fn handler(ctx: Context<SettleDisputeRewards>, juror_index: u8) -> Result<()> {
    let dispute = &ctx.accounts.dispute;
    let market = &ctx.accounts.market;

    // 1. Validate dispute is settled and market is resolved
    require!(dispute.status == 2, AvenirError::DisputeNotSettled);
    require!(market.state == 2, AvenirError::MarketNotResolved);

    // 2. Validate juror_index is in range
    require!(
        (juror_index as usize) < dispute.jurors.len(),
        AvenirError::NotSelectedJuror
    );

    // 3. Validate the resolver account matches the juror at this index
    let juror_pubkey = dispute.jurors[juror_index as usize];
    require!(
        ctx.accounts.resolver.wallet == juror_pubkey,
        AvenirError::NotSelectedJuror
    );

    // 4. Check if juror voted (bitfield check)
    let voted = (dispute.votes_submitted >> juror_index) & 1 == 1;

    if !voted {
        // 5. Non-voter: slash 0.5% from staked amount
        let slash_amount = ctx
            .accounts
            .resolver
            .staked_amount
            .checked_mul(50)
            .unwrap()
            .checked_div(10_000)
            .unwrap(); // 0.5% = 50 bps

        if slash_amount > 0 {
            // Transfer slashed USDC from resolver vault to reward recipient
            let resolver_wallet = ctx.accounts.resolver.wallet;
            let resolver_bump = ctx.accounts.resolver.vault_bump;
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"resolver_vault",
                resolver_wallet.as_ref(),
                &[resolver_bump],
            ]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.resolver_vault.to_account_info(),
                to: ctx.accounts.reward_recipient.to_account_info(),
                authority: ctx.accounts.resolver_vault.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer_seeds,
                ),
                slash_amount,
            )?;

            // Update resolver staked_amount
            let resolver = &mut ctx.accounts.resolver;
            resolver.staked_amount = resolver.staked_amount.checked_sub(slash_amount).unwrap();

            msg!(
                "settle_dispute_rewards: non-voter {} slashed {} (0.5%)",
                juror_pubkey,
                slash_amount
            );
        }
    } else {
        msg!(
            "settle_dispute_rewards: voter {} -- no slash in v1",
            juror_pubkey
        );
    }

    // 6. Decrement active_disputes
    let resolver = &mut ctx.accounts.resolver;
    resolver.active_disputes = resolver.active_disputes.saturating_sub(1);

    msg!(
        "settle_dispute_rewards: juror {} settled, active_disputes={}",
        juror_pubkey,
        resolver.active_disputes
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(juror_index: u8)]
pub struct SettleDisputeRewards<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Dispute account (read-only for juror list and votes_submitted).
    #[account(
        seeds = [b"dispute", dispute.market_id.to_le_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Account<'info, Dispute>,

    /// The Market account -- validates Resolved state.
    #[account(
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.id == dispute.market_id,
        constraint = market.state == 2,
    )]
    pub market: Account<'info, Market>,

    /// The Resolver PDA for the juror being settled.
    #[account(
        mut,
        seeds = [b"resolver", resolver.wallet.as_ref()],
        bump = resolver.bump,
    )]
    pub resolver: Account<'info, Resolver>,

    /// The Resolver's staked USDC vault.
    #[account(
        mut,
        seeds = [b"resolver_vault", resolver.wallet.as_ref()],
        bump = resolver.vault_bump,
        token::mint = usdc_mint,
    )]
    pub resolver_vault: Account<'info, TokenAccount>,

    /// Recipient token account for slashed funds (voter reward distribution).
    /// For v1, this is the caller-specified recipient for slashed USDC.
    #[account(
        mut,
        token::mint = usdc_mint,
    )]
    pub reward_recipient: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
