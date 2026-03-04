use anchor_lang::prelude::*;

/// Fixed-layout account for encrypted dispute vote accumulators, used as MPC read/write target.
///
/// This follows the MarketPool pattern exactly -- fixed-layout fields only, no variable-length data.
/// The MPC circuit reads/writes encrypted vote accumulators at known byte offsets.
///
/// Byte offsets for ArgBuilder.account():
///   - yes_votes_encrypted offset: 8 (discriminator) + 8 (market_id) = 16 bytes
///   - no_votes_encrypted offset: 16 + 32 = 48 bytes
///   - Total ciphertext length: 64 bytes (32 yes_votes + 32 no_votes)
///
/// PDA seeds: [b"dispute_tally", market_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct DisputeTally {
    /// Market ID this tally belongs to
    pub market_id: u64,
    /// Encrypted yes-weighted vote accumulator
    pub yes_votes_encrypted: [u8; 32],
    /// Encrypted no-weighted vote accumulator
    pub no_votes_encrypted: [u8; 32],
    /// Arcium nonce for MXE ciphertext
    pub nonce: u128,
    /// PDA bump seed
    pub bump: u8,
}
