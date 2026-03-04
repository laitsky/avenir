use anchor_lang::prelude::*;

/// Maximum number of resolvers in the registry (bounded for on-chain iteration during juror selection)
pub const MAX_RESOLVERS: usize = 64;

/// Singleton PDA containing the list of active, approved resolver wallet pubkeys.
/// Seeds: [b"resolver_registry"]
#[account]
#[derive(InitSpace)]
pub struct ResolverRegistry {
    /// Active, approved resolver wallet pubkeys
    #[max_len(64)]
    pub resolvers: Vec<Pubkey>,
    /// PDA bump seed
    pub bump: u8,
}
