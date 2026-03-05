use anchor_lang::prelude::*;

/// Minimum resolver stake: 500 USDC (6 decimals).
pub const MIN_RESOLVER_STAKE: u64 = 500_000_000;

/// Per-resolver PDA tracking stake, approval status, and withdrawal state.
/// Seeds: [b"resolver", resolver_wallet.key().as_ref()]
#[account]
#[derive(InitSpace)]
pub struct Resolver {
    /// Resolver's wallet address
    pub wallet: Pubkey,
    /// Current USDC stake amount (in token units, 6 decimals)
    pub staked_amount: u64,
    /// Whether admin has approved this resolver
    pub approved: bool,
    /// Number of disputes this resolver is currently serving as juror on
    pub active_disputes: u8,
    /// Unix timestamp of last withdrawal request (0 if none pending)
    pub withdrawal_requested_at: i64,
    /// Amount requested for withdrawal
    pub withdrawal_amount: u64,
    /// PDA bump seed
    pub bump: u8,
    /// Resolver vault token account bump
    /// Vault seeds: [b"resolver_vault", resolver_wallet.key().as_ref()]
    pub vault_bump: u8,
}
