use anchor_lang::prelude::*;

/// Per-user, per-market position tracking
/// PDA seeds: [b"position", market_id.to_le_bytes(), user.key()]
#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    /// The market this position belongs to
    pub market_id: u64,
    /// The user who owns this position
    pub user: Pubkey,
    /// Amount bet on Yes outcome (in USDC lamports)
    pub yes_amount: u64,
    /// Amount bet on No outcome (in USDC lamports)
    pub no_amount: u64,
    /// Whether the user has claimed their payout
    pub claimed: bool,
    /// PDA bump seed
    pub bump: u8,
}
