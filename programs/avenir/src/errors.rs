use anchor_lang::prelude::*;

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
}
