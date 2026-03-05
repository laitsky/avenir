use anchor_lang::prelude::*;

/// Alias required by Arcium macros (callback_accounts, queue_computation_accounts).
/// The generated macro code references `ErrorCode::ClusterNotSet` in the crate scope.
pub use AvenirError as ErrorCode;

#[error_code]
pub enum AvenirError {
    #[msg("Invalid USDC mint address")]
    InvalidMint,
    #[msg("Unauthorized: caller is not the admin")]
    Unauthorized,
    #[msg("Market is not in Open state")]
    MarketNotOpen,
    #[msg("Invalid category value (must be 0-4)")]
    InvalidCategory,
    #[msg("Question exceeds maximum length of 200 characters")]
    QuestionTooLong,
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Creator is not whitelisted")]
    CreatorNotWhitelisted,
    #[msg("Market deadline must be at least 1 hour in the future")]
    DeadlineTooSoon,
    #[msg("Resolution source cannot be empty")]
    EmptyResolutionSource,
    #[msg("Question cannot be empty")]
    EmptyQuestion,
    #[msg("Market has bets and cannot be cancelled")]
    MarketHasBets,
    #[msg("Arcium cluster not set on MXE account")]
    ClusterNotSet,
    #[msg("Market MPC computation is in progress")]
    MpcLocked,
    #[msg("Bet amount must be at least 1 USDC (1,000,000 token units)")]
    BetTooSmall,
    #[msg("Market deadline has passed")]
    MarketExpired,
    #[msg("Cannot bet on opposite side of existing position")]
    WrongSide,
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    #[msg("Market is not in Resolved state")]
    MarketNotResolved,
    #[msg("Market is not in Finalized state")]
    MarketNotFinalized,
    #[msg("No winning position to claim")]
    NoWinningPosition,
    #[msg("Payout has already been claimed")]
    AlreadyClaimed,
    #[msg("Caller is not the market creator")]
    NotMarketCreator,
    #[msg("Market deadline has not passed yet")]
    MarketNotExpired,
    #[msg("Invalid winning outcome (must be 1=Yes or 2=No)")]
    InvalidOutcome,
    #[msg("Arithmetic overflow or invalid math operation")]
    MathOverflow,
    #[msg("Invalid pending bet state")]
    InvalidPendingBet,
    #[msg("Invalid refund destination token account")]
    InvalidRefundAccount,
    #[msg("Market pool is not initialized")]
    PoolNotInitialized,
    #[msg("Dispute tally is not initialized")]
    TallyNotInitialized,

    // Resolver / Dispute errors
    #[msg("Resolver stake must be at least 500 USDC")]
    StakeTooLow,
    #[msg("Resolver is not approved")]
    ResolverNotApproved,
    #[msg("Resolver is already approved")]
    ResolverAlreadyApproved,
    #[msg("Resolver registry is full")]
    RegistryFull,
    #[msg("Cannot withdraw while active in a dispute")]
    ActiveDisputeExists,
    #[msg("7-day withdrawal cooldown has not elapsed")]
    CooldownNotElapsed,
    #[msg("No pending withdrawal request")]
    WithdrawalNotRequested,
    #[msg("Withdrawal would leave stake below minimum")]
    InsufficientStake,
    #[msg("48-hour grace period has expired; market must resolve via dispute")]
    GracePeriodExpired,
    #[msg("Caller has no position on this market")]
    NotMarketParticipant,
    #[msg("Market is already in dispute")]
    MarketAlreadyDisputed,
    #[msg("48-hour grace period has not expired yet")]
    GracePeriodNotExpired,
    #[msg("Not enough approved resolvers for jury selection")]
    NotEnoughResolvers,
    #[msg("Caller is not a selected juror for this dispute")]
    NotSelectedJuror,
    #[msg("Juror has already submitted a vote")]
    AlreadyVoted,
    #[msg("Dispute voting window has closed")]
    VotingWindowClosed,
    #[msg("Dispute is not in voting state")]
    DisputeNotVoting,
    #[msg("Not enough votes to finalize dispute")]
    QuorumNotReached,
    #[msg("Tiebreaker juror has already been added")]
    TiebreakerAlreadyAdded,
    #[msg("Dispute is not settled")]
    DisputeNotSettled,
}
