use anchor_lang::prelude::*;

/// Fixed-layout account for encrypted pool state, used as MPC read/write target.
///
/// This account exists separately from Market because Market has variable-length
/// String fields (question, resolution_source) that make byte offsets non-deterministic.
/// MarketPool has ONLY fixed-size fields, so ArgBuilder.account() can always read
/// ciphertext at a known byte offset:
///   - yes_pool_encrypted offset: 8 (discriminator) + 8 (market_id) = 16 bytes
///   - no_pool_encrypted offset: 16 + 32 = 48 bytes
///
/// PDA seeds: [b"market_pool", market_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct MarketPool {
    /// Market ID this pool belongs to
    pub market_id: u64,
    /// Encrypted Yes pool ciphertext (Arcium MXE-owned)
    pub yes_pool_encrypted: [u8; 32],
    /// Encrypted No pool ciphertext (Arcium MXE-owned)
    pub no_pool_encrypted: [u8; 32],
    /// Arcium nonce for MXE ciphertext (required for decryption in subsequent MPC calls)
    pub nonce: u128,
    /// PDA bump seed
    pub bump: u8,
}
