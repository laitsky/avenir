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

    // MPC instructions -- hello_world
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

    // MPC instructions -- init_pool
    pub fn init_pool_comp_def(ctx: Context<InitPoolCompDef>) -> Result<()> {
        instructions::mpc::init_pool_comp_def::handler(ctx)
    }

    pub fn init_pool(
        ctx: Context<InitPool>,
        computation_offset: u64,
    ) -> Result<()> {
        instructions::mpc::init_pool::handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "init_pool")]
    pub fn init_pool_callback(
        ctx: Context<InitPoolCallback>,
        output: SignedComputationOutputs<InitPoolOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(InitPoolOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("init_pool computation failed: {}", e);
                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        // Write initial encrypted zeros to MarketPool
        let market_pool = &mut ctx.accounts.market_pool;
        market_pool.yes_pool_encrypted = o.ciphertexts[0];
        market_pool.no_pool_encrypted = o.ciphertexts[1];
        market_pool.nonce = o.nonce;

        msg!(
            "init_pool complete - MarketPool {} initialized with encrypted zeros",
            market_pool.market_id
        );
        Ok(())
    }

    // MPC instructions -- update_pool
    pub fn init_update_pool_comp_def(ctx: Context<InitUpdatePoolCompDef>) -> Result<()> {
        instructions::mpc::init_update_pool_comp_def::handler(ctx)
    }

    pub fn update_pool(
        ctx: Context<UpdatePool>,
        computation_offset: u64,
        is_yes_ciphertext: [u8; 32],
        amount_ciphertext: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::mpc::update_pool::handler(
            ctx,
            computation_offset,
            is_yes_ciphertext,
            amount_ciphertext,
            pub_key,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "update_pool")]
    pub fn update_pool_callback(
        ctx: Context<UpdatePoolCallback>,
        output: SignedComputationOutputs<UpdatePoolOutput>,
    ) -> Result<()> {
        // update_pool returns (Enc<Mxe, PoolTotals>, u8)
        // Generated output structure:
        //   UpdatePoolOutput { field_0: UpdatePoolOutputStruct0 }
        //   UpdatePoolOutputStruct0 { field_0: MXEEncryptedStruct<2>, field_1: u8 }
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(UpdatePoolOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("update_pool computation failed: {}", e);
                // Release mpc_lock even on failure so the market isn't permanently locked
                ctx.accounts.market.mpc_lock = false;
                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        // Write updated pool ciphertexts back to MarketPool
        let market_pool = &mut ctx.accounts.market_pool;
        market_pool.yes_pool_encrypted = result.field_0.ciphertexts[0];
        market_pool.no_pool_encrypted = result.field_0.ciphertexts[1];
        market_pool.nonce = result.field_0.nonce;

        // Write revealed sentiment to Market (plaintext u8)
        let market = &mut ctx.accounts.market;
        market.sentiment = result.field_1;

        // Release mpc_lock
        market.mpc_lock = false;

        // Increment total_bets
        market.total_bets += 1;

        msg!(
            "update_pool complete - MarketPool {} updated, sentiment={}, total_bets={}",
            market_pool.market_id,
            market.sentiment,
            market.total_bets
        );
        Ok(())
    }
}
