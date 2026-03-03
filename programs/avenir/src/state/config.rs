use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    /// The admin authority that can update protocol settings
    pub admin: Pubkey,
    /// The address that receives protocol fees
    pub fee_recipient: Pubkey,
    /// The USDC mint address used for all bets
    pub usdc_mint: Pubkey,
    /// Protocol fee in basis points (e.g., 200 = 2%)
    pub protocol_fee_bps: u16,
    /// Auto-incrementing counter for market IDs
    pub market_counter: u64,
    /// Emergency pause flag for the protocol
    pub paused: bool,
    /// PDA bump seed
    pub bump: u8,
}
