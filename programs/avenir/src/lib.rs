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

    pub fn resolve_market(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
        instructions::resolve_market::handler(ctx, winning_outcome)
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        instructions::claim_payout::handler(ctx)
    }

    pub fn open_dispute<'info>(ctx: Context<'_, '_, 'info, 'info, OpenDispute<'info>>) -> Result<()> {
        instructions::open_dispute::handler(ctx)
    }

    pub fn register_resolver(ctx: Context<RegisterResolver>, amount: u64) -> Result<()> {
        instructions::register_resolver::handler(ctx, amount)
    }

    pub fn approve_resolver(ctx: Context<ApproveResolver>) -> Result<()> {
        instructions::approve_resolver::handler(ctx)
    }

    pub fn stake_resolver(ctx: Context<StakeResolver>, amount: u64) -> Result<()> {
        instructions::stake_resolver::handler(ctx, amount)
    }

    pub fn withdraw_resolver(
        ctx: Context<WithdrawResolver>,
        amount: u64,
        execute: bool,
    ) -> Result<()> {
        instructions::withdraw_resolver::handler(ctx, amount, execute)
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        is_yes: bool,
        computation_offset: u64,
        is_yes_ciphertext: [u8; 32],
        amount_ciphertext: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::place_bet::handler(
            ctx,
            amount,
            is_yes,
            computation_offset,
            is_yes_ciphertext,
            amount_ciphertext,
            pub_key,
            nonce,
        )
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
        use anchor_spl::token::{self, Transfer};

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

                // Extract values before CPI to satisfy borrow checker
                let market_id = ctx.accounts.market.id;
                let bump = ctx.accounts.market.bump;
                let pending_amount = ctx.accounts.market.pending_amount;

                // Refund pending bettor's USDC from vault
                if pending_amount > 0 {
                    let signer_seeds: &[&[&[u8]]] = &[&[
                        b"market",
                        &market_id.to_le_bytes(),
                        &[bump],
                    ]];

                    let cpi_accounts = Transfer {
                        from: ctx.accounts.market_vault.to_account_info(),
                        to: ctx.accounts.bettor_token_account.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    };
                    let cpi_ctx = CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        cpi_accounts,
                        signer_seeds,
                    );
                    token::transfer(cpi_ctx, pending_amount)?;
                }

                // Clear lock and pending fields
                let market = &mut ctx.accounts.market;
                market.mpc_lock = false;
                market.lock_timestamp = 0;
                market.pending_bettor = Pubkey::default();
                market.pending_amount = 0;
                market.pending_is_yes = false;

                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        // === Success path ===

        // Write updated pool ciphertexts back to MarketPool
        let market_pool = &mut ctx.accounts.market_pool;
        market_pool.yes_pool_encrypted = result.field_0.ciphertexts[0];
        market_pool.no_pool_encrypted = result.field_0.ciphertexts[1];
        market_pool.nonce = result.field_0.nonce;

        // Write revealed sentiment to Market (plaintext u8)
        let market = &mut ctx.accounts.market;
        market.sentiment = result.field_1;

        // Update UserPosition with pending bet amount
        let position = &mut ctx.accounts.user_position;
        if market.pending_is_yes {
            position.yes_amount = position.yes_amount.checked_add(market.pending_amount).unwrap();
        } else {
            position.no_amount = position.no_amount.checked_add(market.pending_amount).unwrap();
        }

        // Increment total_bets
        market.total_bets = market.total_bets.checked_add(1).unwrap();

        // Clear lock and pending fields
        market.mpc_lock = false;
        market.lock_timestamp = 0;
        market.pending_bettor = Pubkey::default();
        market.pending_amount = 0;
        market.pending_is_yes = false;

        msg!(
            "update_pool complete - MarketPool {} updated, sentiment={}, total_bets={}, position updated for {}",
            market_pool.market_id,
            market.sentiment,
            market.total_bets,
            position.user
        );
        Ok(())
    }

    // MPC instructions -- init_dispute_tally
    pub fn init_dispute_tally_comp_def(ctx: Context<InitDisputeTallyCompDef>) -> Result<()> {
        instructions::mpc::init_dispute_tally_comp_def::handler(ctx)
    }

    pub fn init_dispute_tally(
        ctx: Context<InitDisputeTally>,
        computation_offset: u64,
    ) -> Result<()> {
        instructions::mpc::init_dispute_tally::handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "init_dispute_tally")]
    pub fn init_dispute_tally_callback(
        ctx: Context<InitDisputeTallyCallback>,
        output: SignedComputationOutputs<InitDisputeTallyOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(InitDisputeTallyOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("init_dispute_tally computation failed: {}", e);
                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        // Write initial encrypted zeros to DisputeTally
        let dispute_tally = &mut ctx.accounts.dispute_tally;
        dispute_tally.yes_votes_encrypted = o.ciphertexts[0];
        dispute_tally.no_votes_encrypted = o.ciphertexts[1];
        dispute_tally.nonce = o.nonce;

        msg!(
            "init_dispute_tally complete - DisputeTally {} initialized with encrypted zeros",
            dispute_tally.market_id
        );
        Ok(())
    }

    // MPC instructions -- add_dispute_vote (cast_vote is the juror-facing entry point)
    pub fn init_add_dispute_vote_comp_def(ctx: Context<InitAddDisputeVoteCompDef>) -> Result<()> {
        instructions::mpc::add_dispute_vote_comp_def::handler(ctx)
    }

    pub fn cast_vote(
        ctx: Context<CastVote>,
        computation_offset: u64,
        vote_ciphertext: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::cast_vote::handler(ctx, computation_offset, vote_ciphertext, pub_key, nonce)
    }

    #[arcium_callback(encrypted_ix = "add_dispute_vote")]
    pub fn add_dispute_vote_callback(
        ctx: Context<AddDisputeVoteCallback>,
        output: SignedComputationOutputs<AddDisputeVoteOutput>,
    ) -> Result<()> {
        // add_dispute_vote returns Enc<Mxe, VoteTotals> -- updated encrypted tally
        // Generated output structure:
        //   AddDisputeVoteOutput { field_0: MXEEncryptedStruct<2> }
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(AddDisputeVoteOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("add_dispute_vote computation failed: {}", e);

                // Clear MPC lock on failure
                let dispute = &mut ctx.accounts.dispute;
                dispute.mpc_lock = false;
                dispute.lock_timestamp = 0;

                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        // === Success path ===

        // Write updated encrypted vote ciphertexts back to DisputeTally
        let dispute_tally = &mut ctx.accounts.dispute_tally;
        dispute_tally.yes_votes_encrypted = o.ciphertexts[0];
        dispute_tally.no_votes_encrypted = o.ciphertexts[1];
        dispute_tally.nonce = o.nonce;

        // Clear MPC lock on dispute
        let dispute = &mut ctx.accounts.dispute;
        dispute.mpc_lock = false;
        dispute.lock_timestamp = 0;

        msg!(
            "add_dispute_vote complete - DisputeTally {} updated, vote_count={}",
            dispute_tally.market_id,
            dispute.vote_count
        );
        Ok(())
    }

    // MPC instructions -- finalize_dispute
    pub fn init_finalize_dispute_comp_def(ctx: Context<InitFinalizeDisputeCompDef>) -> Result<()> {
        instructions::mpc::finalize_dispute_comp_def::handler(ctx)
    }

    pub fn finalize_dispute(ctx: Context<FinalizeDispute>, computation_offset: u64) -> Result<()> {
        instructions::mpc::finalize_dispute::handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "finalize_dispute")]
    pub fn finalize_dispute_callback(
        ctx: Context<FinalizeDisputeCallback>,
        output: SignedComputationOutputs<FinalizeDisputeOutput>,
    ) -> Result<()> {
        // finalize_dispute returns (u64, u64) with both .reveal()'d
        // Generated output structure:
        //   FinalizeDisputeOutput { field_0: FinalizeDisputeOutputStruct0 }
        //   FinalizeDisputeOutputStruct0 { field_0: u64, field_1: u64 }
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(FinalizeDisputeOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("finalize_dispute computation failed: {}", e);

                // Clear MPC lock and revert status to Voting on failure
                let dispute = &mut ctx.accounts.dispute;
                dispute.mpc_lock = false;
                dispute.lock_timestamp = 0;
                dispute.status = 0; // Revert to Voting

                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        // === Success path ===

        let revealed_yes_votes = result.field_0;
        let revealed_no_votes = result.field_1;

        let market = &mut ctx.accounts.market;
        let dispute = &mut ctx.accounts.dispute;

        if revealed_yes_votes > revealed_no_votes {
            // Yes wins -- resolve market with Yes outcome
            market.winning_outcome = 1;
            market.state = 2; // Resolved
            dispute.status = 2; // Settled
        } else if revealed_no_votes > revealed_yes_votes {
            // No wins -- resolve market with No outcome
            market.winning_outcome = 2;
            market.state = 2; // Resolved
            dispute.status = 2; // Settled
        } else {
            // Tie -- do NOT resolve. Revert dispute to Voting for tiebreaker flow.
            dispute.status = 0; // Back to Voting
        }

        // Clear MPC lock
        dispute.mpc_lock = false;
        dispute.lock_timestamp = 0;

        msg!(
            "finalize_dispute complete - yes_votes={}, no_votes={}, dispute.status={}, market.state={}",
            revealed_yes_votes,
            revealed_no_votes,
            dispute.status,
            market.state,
        );
        Ok(())
    }

    // MPC instructions -- compute_payouts
    pub fn init_compute_payouts_comp_def(ctx: Context<InitComputePayoutsCompDef>) -> Result<()> {
        instructions::mpc::init_compute_payouts_comp_def::handler(ctx)
    }

    pub fn compute_payouts(ctx: Context<ComputePayouts>, computation_offset: u64) -> Result<()> {
        instructions::mpc::compute_payouts::handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "compute_payouts")]
    pub fn compute_payouts_callback(
        ctx: Context<ComputePayoutsCallback>,
        output: SignedComputationOutputs<ComputePayoutsOutput>,
    ) -> Result<()> {
        // compute_payouts returns (u64, u64) with both .reveal()'d
        // Generated output structure:
        //   ComputePayoutsOutput { field_0: ComputePayoutsOutputStruct0 }
        //   ComputePayoutsOutputStruct0 { field_0: u64, field_1: u64 }
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ComputePayoutsOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("compute_payouts computation failed: {}", e);

                // Clear lock on failure -- no refund needed (compute_payouts holds no user funds)
                let market = &mut ctx.accounts.market;
                market.mpc_lock = false;
                market.lock_timestamp = 0;

                return Err(arcium_anchor::ArciumError::AbortedComputation.into());
            }
        };

        // === Success path ===

        // Write revealed pool totals to Market
        let market = &mut ctx.accounts.market;
        market.revealed_yes_pool = result.field_0;
        market.revealed_no_pool = result.field_1;

        // Transition to Finalized state (4)
        market.state = 4;

        // Clear lock
        market.mpc_lock = false;
        market.lock_timestamp = 0;

        msg!(
            "compute_payouts complete - revealed_yes_pool={}, revealed_no_pool={}, state=Finalized",
            market.revealed_yes_pool,
            market.revealed_no_pool,
        );
        Ok(())
    }
}
