use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Unique market identifier (auto-incremented from Config.market_counter)
    pub id: u64,
    /// Market question, max 200 characters (tweet-length)
    #[max_len(200)]
    pub question: String,
    /// Resolution source URL or reference -- required, immutable after creation
    #[max_len(128)]
    pub resolution_source: String,
    /// Category: 0=Politics, 1=Crypto, 2=Sports, 3=Culture, 4=Economics
    pub category: u8,
    /// Unix timestamp when the market should be resolved
    pub resolution_time: i64,
    /// Market state: 0=Open, 1=Locked, 2=Resolved, 3=Disputed
    pub state: u8,
    /// Winning outcome: 0=None, 1=Yes, 2=No
    pub winning_outcome: u8,
    /// Sentiment bucket: 0=Unknown, 1=LeaningYes, 2=Even, 3=LeaningNo
    pub sentiment: u8,
    /// Total number of bets placed on this market
    pub total_bets: u64,
    /// The address that created this market
    pub creator: Pubkey,
    /// Unix timestamp when the market was created
    pub created_at: i64,
    /// Snapshot of config fee_recipient at market creation
    pub config_fee_recipient: Pubkey,
    /// Snapshot of config protocol_fee_bps at market creation
    pub config_fee_bps: u16,
    /// Sequential MPC lock - prevents concurrent bet processing
    pub mpc_lock: bool,
    /// Unix timestamp when mpc_lock was set (for 60s timeout detection)
    pub lock_timestamp: i64,
    /// Pubkey of the user whose bet is currently being processed by MPC
    pub pending_bettor: Pubkey,
    /// USDC amount of the pending bet (for refund on failure/timeout)
    pub pending_amount: u64,
    /// Which side the pending bet is on (for callback to update correct side of UserPosition)
    pub pending_is_yes: bool,
    /// PDA bump seed for the market account
    pub bump: u8,
    /// PDA bump seed for the market vault token account
    /// Vault seeds: [b"vault", market_id.to_le_bytes()]
    /// Vault authority: this Market PDA (token::authority = market)
    pub vault_bump: u8,
    /// PDA bump seed for the associated MarketPool account
    /// MarketPool seeds: [b"market_pool", market_id.to_le_bytes()]
    pub market_pool_bump: u8,
}
