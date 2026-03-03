use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::AvenirError;
use crate::state::{Config, CreatorWhitelist, Market, MarketPool};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateMarketParams {
    pub question: String,
    pub resolution_source: String,
    pub category: u8,
    pub resolution_time: i64,
}

#[derive(Accounts)]
#[instruction(params: CreateMarketParams)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = !config.paused @ AvenirError::ProtocolPaused,
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"whitelist", creator.key().as_ref()],
        bump = whitelist.bump,
        constraint = whitelist.active @ AvenirError::CreatorNotWhitelisted,
    )]
    pub whitelist: Account<'info, CreatorWhitelist>,

    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", config.market_counter.checked_add(1).unwrap().to_le_bytes().as_ref()],
        bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        seeds = [b"vault", config.market_counter.checked_add(1).unwrap().to_le_bytes().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub market_vault: Account<'info, TokenAccount>,

    /// MarketPool PDA -- fixed-layout account for encrypted pool state.
    /// Created alongside Market so init_pool can write to it via callback.
    #[account(
        init,
        payer = creator,
        space = 8 + MarketPool::INIT_SPACE,
        seeds = [b"market_pool", config.market_counter.checked_add(1).unwrap().to_le_bytes().as_ref()],
        bump,
    )]
    pub market_pool: Account<'info, MarketPool>,

    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ AvenirError::InvalidMint,
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateMarket>, params: CreateMarketParams) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Validations
    require!(
        params.resolution_time > now + 3600,
        AvenirError::DeadlineTooSoon
    );
    require!(params.category <= 4, AvenirError::InvalidCategory);
    require!(!params.question.is_empty(), AvenirError::EmptyQuestion);
    require!(params.question.len() <= 200, AvenirError::QuestionTooLong);
    require!(
        !params.resolution_source.is_empty(),
        AvenirError::EmptyResolutionSource
    );

    // Increment market counter
    let config = &mut ctx.accounts.config;
    config.market_counter += 1;

    // Initialize market
    let market = &mut ctx.accounts.market;
    market.id = config.market_counter;
    market.question = params.question;
    market.resolution_source = params.resolution_source;
    market.category = params.category;
    market.resolution_time = params.resolution_time;
    market.state = 0; // Open
    market.winning_outcome = 0; // None
    market.sentiment = 0; // Unknown
    market.total_bets = 0;
    market.creator = ctx.accounts.creator.key();
    market.created_at = now;
    market.config_fee_recipient = config.fee_recipient;
    market.config_fee_bps = config.protocol_fee_bps;
    market.mpc_lock = false;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.market_vault;
    market.market_pool_bump = ctx.bumps.market_pool;

    // Initialize MarketPool PDA (empty -- init_pool MPC must be called separately
    // to populate with valid MXE-encrypted zeros before update_pool can work)
    let market_pool = &mut ctx.accounts.market_pool;
    market_pool.market_id = config.market_counter;
    market_pool.yes_pool_encrypted = [0u8; 32];
    market_pool.no_pool_encrypted = [0u8; 32];
    market_pool.nonce = 0;
    market_pool.bump = ctx.bumps.market_pool;

    Ok(())
}
