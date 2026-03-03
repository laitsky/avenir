use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN");

#[arcium_program]
pub mod avenir {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    pub fn add_creator(ctx: Context<AddCreator>) -> Result<()> {
        instructions::add_creator::handler(ctx)
    }

    pub fn remove_creator(ctx: Context<RemoveCreator>) -> Result<()> {
        instructions::remove_creator::handler(ctx)
    }

    pub fn create_market(ctx: Context<CreateMarket>, params: CreateMarketParams) -> Result<()> {
        instructions::create_market::handler(ctx, params)
    }

    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        instructions::cancel_market::handler(ctx)
    }

    // MPC instructions
    pub fn init_hello_world_comp_def(ctx: Context<InitHelloWorldCompDef>) -> Result<()> {
        instructions::mpc::init_hello_world_comp_def::handler(ctx)
    }

    pub fn hello_world(
        ctx: Context<HelloWorld>,
        computation_offset: u64,
        a_ciphertext: [u8; 32],
        b_ciphertext: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::mpc::hello_world::handler(
            ctx,
            computation_offset,
            a_ciphertext,
            b_ciphertext,
            pub_key,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "hello_world")]
    pub fn hello_world_callback(
        ctx: Context<HelloWorldCallback>,
        output: SignedComputationOutputs<HelloWorldOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(HelloWorldOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("Hello World computation failed: {}", e);
                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        msg!(
            "Hello World MPC result - ciphertexts: {:?}, nonce: {}",
            o.ciphertexts,
            o.nonce
        );
        Ok(())
    }
}
