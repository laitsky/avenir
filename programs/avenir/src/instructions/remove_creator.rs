use anchor_lang::prelude::*;

use crate::errors::AvenirError;
use crate::state::{Config, CreatorWhitelist};

#[derive(Accounts)]
pub struct RemoveCreator<'info> {
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
        mut,
        seeds = [b"whitelist", creator.key().as_ref()],
        bump = whitelist.bump,
        close = admin,
    )]
    pub whitelist: Account<'info, CreatorWhitelist>,

    /// CHECK: The creator address whose whitelist entry is being removed. Not read or written; used only for PDA derivation.
    pub creator: AccountInfo<'info>,
}

pub fn handler(_ctx: Context<RemoveCreator>) -> Result<()> {
    // The `close = admin` constraint handles closing the PDA and returning rent.
    // Removing a creator does NOT affect their existing markets.
    Ok(())
}
