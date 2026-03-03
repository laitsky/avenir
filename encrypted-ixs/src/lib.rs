use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    // Placeholder encrypted instruction for Arcium MPC
    // Real circuits will be implemented in Phase 3:
    // - update_pool: encrypted pool accumulation + sentiment bucket update
    // - compute_payouts: reveal pool totals at market resolution
    // - add_dispute_vote: encrypted vote accumulation for disputes

    /// Encrypted pool totals for a prediction market.
    /// [yes_pool, no_pool] in USDC lamports (u64).
    pub type PoolTotals = [u64; 2];

    /// Initializes encrypted pool counters for a new market.
    ///
    /// Creates a PoolTotals structure with zero for both yes and no pools.
    /// The counters remain encrypted and can only be updated through MPC operations.
    #[instruction]
    pub fn init_pool(mxe: Mxe) -> Enc<Mxe, PoolTotals> {
        let pool_totals: PoolTotals = [0, 0];
        mxe.from_arcis(pool_totals)
    }
}
