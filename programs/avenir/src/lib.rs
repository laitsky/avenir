use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN");

#[program]
pub mod avenir {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }
}
