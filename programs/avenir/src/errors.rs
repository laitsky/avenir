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
}
