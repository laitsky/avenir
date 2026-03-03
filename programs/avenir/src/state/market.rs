use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Unique market identifier (auto-incremented from Config.market_counter)
    pub id: u64,
    /// Market question, max 200 characters (tweet-length)
    #[max_len(200)]
    pub question: String,
    /// Category: 0=Politics, 1=Crypto, 2=Sports, 3=Culture, 4=Economics
    pub category: u8,
    /// Unix timestamp when the market should be resolved
    pub resolution_time: i64,
    /// Market state: 0=Open, 1=Locked, 2=Resolved, 3=Disputed
    pub state: u8,
    /// Winning outcome: 0=None, 1=Yes, 2=No
    pub winning_outcome: u8,
    /// Encrypted Yes pool total (Arcium ciphertext)
    pub yes_pool_encrypted: [u8; 32],
    /// Encrypted No pool total (Arcium ciphertext)
    pub no_pool_encrypted: [u8; 32],
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
    /// PDA bump seed for the market account
    pub bump: u8,
    /// PDA bump seed for the market vault token account
    /// Vault seeds: [b"vault", market_id.to_le_bytes()]
    /// Vault authority: this Market PDA (token::authority = market)
    pub vault_bump: u8,
}
