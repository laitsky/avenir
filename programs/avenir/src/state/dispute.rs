use anchor_lang::prelude::*;

/// Per-market dispute PDA tracking juror panel, voting state, and dispute lifecycle.
/// Seeds: [b"dispute", market_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct Dispute {
    /// Market ID this dispute belongs to
    pub market_id: u64,
    /// Dispute status: 0=Voting, 1=Finalizing, 2=Settled
    pub status: u8,
    /// Selected juror wallet pubkeys (7 initial + 1 optional tiebreaker = 8 max)
    #[max_len(8)]
    pub jurors: Vec<Pubkey>,
    /// Stake weight snapshot for each juror (same index as jurors Vec)
    #[max_len(8)]
    pub juror_stakes: Vec<u64>,
    /// Which jurors have voted (bitfield: bit N = juror N has voted)
    pub votes_submitted: u8,
    /// Total votes cast so far
    pub vote_count: u8,
    /// Required votes for quorum (initially 5, increases with tiebreaker)
    pub quorum: u8,
    /// Unix timestamp when voting window opens
    pub voting_start: i64,
    /// Unix timestamp when voting window closes (initially voting_start + 172800)
    pub voting_end: i64,
    /// Whether a tiebreaker juror has been added
    pub tiebreaker_added: bool,
    /// The wallet that triggered the dispute escalation
    pub escalator: Pubkey,
    /// Sequential MPC lock for dispute vote processing
    pub mpc_lock: bool,
    /// Timestamp when mpc_lock was set
    pub lock_timestamp: i64,
    /// PDA bump seed
    pub bump: u8,
    /// Associated DisputeTally PDA bump seed
    pub tally_bump: u8,
}
