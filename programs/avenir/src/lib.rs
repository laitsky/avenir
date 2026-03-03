use anchor_lang::prelude::*;

declare_id!("PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN");

#[program]
pub mod avenir {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
