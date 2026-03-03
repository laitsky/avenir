use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CreatorWhitelist {
    /// The whitelisted creator's public key
    pub creator: Pubkey,
    /// Always true while PDA exists (closed on removal)
    pub active: bool,
    /// PDA bump seed
    pub bump: u8,
}
// Seeds: [b"whitelist", creator_pubkey.as_ref()]
// Space: 8 (discriminator) + 32 (Pubkey) + 1 (bool) + 1 (u8) = 42 bytes
