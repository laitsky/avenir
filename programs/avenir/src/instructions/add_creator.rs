use anchor_lang::prelude::*;

use crate::errors::AvenirError;
use crate::state::{Config, CreatorWhitelist};

#[derive(Accounts)]
pub struct AddCreator<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ AvenirError::Unauthorized,
        constraint = !config.paused @ AvenirError::ProtocolPaused,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = admin,
        space = 8 + CreatorWhitelist::INIT_SPACE,
        seeds = [b"whitelist", creator.key().as_ref()],
        bump,
    )]
    pub whitelist: Account<'info, CreatorWhitelist>,

    /// CHECK: The creator address being whitelisted. Not read or written; used only for PDA derivation.
    pub creator: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddCreator>) -> Result<()> {
    let whitelist = &mut ctx.accounts.whitelist;
    whitelist.creator = ctx.accounts.creator.key();
    whitelist.active = true;
    whitelist.bump = ctx.bumps.whitelist;
    Ok(())
}
