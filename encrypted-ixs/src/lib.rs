use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    /// Encrypted pool totals for a prediction market.
    /// [yes_pool, no_pool] in USDC lamports (u64).
    pub type PoolTotals = [u64; 2];

    /// Bet input from user -- encrypted with user's shared secret.
    pub struct BetInput {
        pub is_yes: bool,
        pub amount: u64,
    }

    /// Initializes encrypted pool counters for a new market.
    ///
    /// Creates a PoolTotals structure with zero for both yes and no pools.
    /// The counters remain encrypted and can only be updated through MPC operations.
    #[instruction]
    pub fn init_pool(mxe: Mxe) -> Enc<Mxe, PoolTotals> {
        let pool_totals: PoolTotals = [0, 0];
        mxe.from_arcis(pool_totals)
    }

    /// Update encrypted pool totals with a new bet and compute sentiment bucket.
    ///
    /// Takes an encrypted bet input (Shared) and existing pool state (Mxe),
    /// updates the pool totals, and computes a sentiment bucket.
    ///
    /// Sentiment uses multiplication-based comparison (avoids expensive division):
    /// - yes_pool * 2 > total  =>  Leaning Yes (1)
    /// - no_pool * 2 > total   =>  Leaning No (3)
    /// - otherwise              =>  Even (2)
    ///
    /// Returns: (updated pool totals as Mxe, sentiment value revealed as plaintext u8)
    #[instruction]
    pub fn update_pool(
        bet_ctxt: Enc<Shared, BetInput>,
        pool_ctxt: Enc<Mxe, PoolTotals>,
    ) -> (Enc<Mxe, PoolTotals>, u8) {
        let bet = bet_ctxt.to_arcis();
        let mut pool = pool_ctxt.to_arcis();

        // Update pool totals based on bet direction
        if bet.is_yes {
            pool[0] += bet.amount; // yes_pool
        } else {
            pool[1] += bet.amount; // no_pool
        }

        // Compute sentiment bucket using multiplication (no division)
        let total = pool[0] + pool[1];
        let sentiment: u8 = if pool[0] * 2 > total {
            1 // Leaning Yes
        } else if pool[1] * 2 > total {
            3 // Leaning No
        } else {
            2 // Even
        };

        // Return updated pool as MXE-encrypted, sentiment as revealed plaintext
        (pool_ctxt.owner.from_arcis(pool), sentiment.reveal())
    }

    /// Reveal encrypted pool totals at market resolution.
    ///
    /// Takes the encrypted PoolTotals and returns both values as plaintext.
    /// This ends pool privacy -- totals become public at resolution.
    /// Payout math uses these revealed values on-chain (RES-09).
    #[instruction]
    pub fn compute_payouts(
        pool_ctxt: Enc<Mxe, PoolTotals>,
    ) -> (u64, u64) {
        let pool = pool_ctxt.to_arcis();
        (pool[0].reveal(), pool[1].reveal())
    }

    /// Encrypted dispute vote accumulators.
    /// [yes_weighted_votes, no_weighted_votes] in USDC lamport-weighted units.
    pub type VoteTotals = [u64; 2];

    /// Vote input from juror -- encrypted with juror's shared secret.
    pub struct VoteInput {
        pub is_yes: bool,
    }

    /// Initializes encrypted vote counters for a new dispute.
    ///
    /// Creates a VoteTotals structure with zero for both yes and no weighted votes.
    /// The counters remain encrypted and can only be updated through MPC operations.
    #[instruction]
    pub fn init_dispute_tally(mxe: Mxe) -> Enc<Mxe, VoteTotals> {
        let vote_totals: VoteTotals = [0, 0];
        mxe.from_arcis(vote_totals)
    }

    /// Accumulate a stake-weighted encrypted vote into the dispute tally.
    ///
    /// Takes:
    /// - vote_ctxt: Encrypted bool (is_yes) from juror's shared secret
    /// - tally_ctxt: Existing encrypted VoteTotals from MXE
    /// - stake_weight: Plaintext u64 (juror's staked amount, passed as plaintext since it's public on Resolver account)
    ///
    /// Returns updated encrypted tally (Mxe-owned). No revealed values -- tally stays private.
    #[instruction]
    pub fn add_dispute_vote(
        vote_ctxt: Enc<Shared, VoteInput>,
        tally_ctxt: Enc<Mxe, VoteTotals>,
        stake_weight: u64,
    ) -> Enc<Mxe, VoteTotals> {
        let vote = vote_ctxt.to_arcis();
        let mut tally = tally_ctxt.to_arcis();

        if vote.is_yes {
            tally[0] += stake_weight;
        } else {
            tally[1] += stake_weight;
        }

        tally_ctxt.owner.from_arcis(tally)
    }

    /// Hello-world circuit for environment validation.
    /// Takes two encrypted u64 inputs (Shared) and returns their sum (Mxe-owned).
    /// Validates: Enc<Shared, T> input, Enc<Mxe, T> output, basic arithmetic, to_arcis/from_arcis lifecycle.
    #[instruction]
    pub fn hello_world(
        a_ctxt: Enc<Shared, u64>,
        b_ctxt: Enc<Shared, u64>,
    ) -> Enc<Mxe, u64> {
        let a = a_ctxt.to_arcis();
        let b = b_ctxt.to_arcis();
        let sum = a + b;
        Mxe::get().from_arcis(sum)
    }
}
