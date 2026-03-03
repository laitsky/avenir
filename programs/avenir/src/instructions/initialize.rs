use anchor_lang::prelude::*;

use crate::state::Config;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub fee_recipient: Pubkey,
    pub usdc_mint: Pubkey,
    pub protocol_fee_bps: u16,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.fee_recipient = params.fee_recipient;
    config.usdc_mint = params.usdc_mint;
    config.protocol_fee_bps = params.protocol_fee_bps;
    config.market_counter = 0;
    config.paused = false;
    config.bump = ctx.bumps.config;
    Ok(())
}
