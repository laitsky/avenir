# Phase 5: Encrypted Betting - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can place USDC bets on binary markets with their amounts encrypted, pool totals hidden, and a fuzzy sentiment bucket visible. This phase builds the place_bet instruction, wires the update_pool MPC flow end-to-end, implements sequential lock enforcement with timeout recovery, and handles bet validation and position tracking. Resolution, payouts, and dispute are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Multi-bet rules
- Multiple bets allowed on the same market — amounts accumulate in UserPosition
- One side only per user per market — first bet locks the user's side (Yes or No), subsequent bets on the opposite side are rejected
- Single atomic instruction: place_bet transfers USDC to vault and queues MPC in one transaction
- No maximum bet amount — minimum $1 USDC (1,000,000 lamports), no upper bound

### Lock contention
- Reject immediately with MpcLocked error when mpc_lock is active — no on-chain queue
- Frontend auto-retry with exponential backoff (~2-3s intervals) intended for Phase 7 wiring
- Time-based lock timeout: 60 seconds — if mpc_lock is older than 60s, treat MPC as failed
- Lock timeout adds a `lock_timestamp: i64` field to Market (set alongside mpc_lock)
- When timeout detected by next place_bet: auto-refund stuck user's USDC, clear lock, then proceed with new bet

### Failure & refund
- MPC failure callback refunds USDC from vault back to the pending bettor
- Pending bet data stored on Market account: `pending_bettor: Pubkey`, `pending_amount: u64`, `pending_is_yes: bool`
- On failure: callback returns USDC to pending_bettor, clears mpc_lock + pending fields, does NOT update pool or position
- On lock timeout: next place_bet detects stale lock, refunds pending_bettor, then processes new bet
- UserPosition is NOT created/updated until MPC succeeds — on failure, only USDC refund needed, no position cleanup
- `pending_is_yes` needed for success callback to know which side of UserPosition to update (not needed for refund)

### Position management
- UserPosition created in update_pool_callback (success path only), not in place_bet
- Callback uses init_if_needed pattern — creates UserPosition PDA on first successful bet, accumulates on subsequent
- One UserPosition PDA per user per market (seeds: [b"position", market_id, user_pubkey])
- Positions are plaintext (yes_amount, no_amount visible on-chain) — only aggregate pool totals are encrypted

### Position privacy model
- Individual bet amounts visible on-chain (UserPosition is plaintext) — this is intentional
- Core privacy value: hiding AGGREGATE pool totals prevents herding on sentiment
- Encrypting individual positions is deferred (significant MPC complexity, not needed for anti-herding value prop)

### Claude's Discretion
- Exact place_bet instruction account ordering and validation sequence
- Error message wording for bet rejection cases (deadline passed, wrong side, insufficient balance)
- How update_pool_callback creates UserPosition PDA (remaining account passing strategy)
- Lock timeout check implementation details (inline in place_bet vs separate helper)
- Test structure and coverage strategy

</decisions>

<specifics>
## Specific Ideas

- Flow: place_bet (USDC transfer + MPC queue) → update_pool circuit (encrypted pool update + sentiment) → update_pool_callback (write pool, update sentiment, create/update position, clear lock)
- Failure flow: MPC fails → update_pool_callback (refund USDC, clear lock, clear pending fields)
- Timeout flow: new place_bet detects lock_timestamp > 60s → refund pending bettor → clear lock → process new bet
- Market struct needs 3 new fields: pending_bettor (Pubkey), pending_amount (u64), pending_is_yes (bool), lock_timestamp (i64)
- UserPosition.claimed field already exists for Phase 6 payout tracking

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `update_pool` instruction (`instructions/mpc/update_pool.rs`): Already queues MPC computation with ArgBuilder, checks mpc_lock, sets lock — place_bet will wrap this with USDC transfer logic
- `update_pool_callback` struct (`instructions/mpc/update_pool_callback.rs`): Account struct exists, needs handler logic for writing MPC results back
- `update_pool` circuit (`encrypted-ixs/src/lib.rs`): Full BetInput → PoolTotals update with sentiment computation — no changes needed
- `UserPosition` struct (`state/user_position.rs`): Has market_id, user, yes_amount, no_amount, claimed, bump — ready for use
- `MarketPool` struct (`state/market_pool.rs`): Fixed-layout encrypted pool state with deterministic byte offsets
- `Market` struct (`state/market.rs`): Has mpc_lock, sentiment, total_bets — needs pending_bettor, pending_amount, pending_is_yes, lock_timestamp fields added
- `AvenirError` enum (`errors.rs`): Has MpcLocked, MarketNotOpen, ProtocolPaused — needs new variants for betting errors (BetTooSmall, MarketExpired, WrongSide, InsufficientBalance)
- Existing MPC test helpers from Phase 3 (`tests/helpers/`): ArciumContext, encryption utilities — reusable for Phase 5 integration tests

### Established Patterns
- Anchor 0.32.1 with `#[account]`, `#[derive(InitSpace)]`, PDA seeds
- `#[arcium_program]` for MPC-integrated instructions
- Handler functions separated from account validation structs
- MPC callback uses `#[callback_accounts("circuit_name")]` macro
- ArgBuilder.account() at offset 16, length 64 for MarketPool ciphertext
- mpc_lock released on both success AND failure callback paths

### Integration Points
- `place_bet` will need SPL Token transfer CPI: user's token account → market vault
- Market vault PDA seeded `[b"vault", market_id.to_le_bytes()]` with Market PDA as authority
- `create_market` already initializes MarketPool PDA — no changes needed for pool initialization
- `init_pool` MPC must complete before any update_pool calls (already enforced)
- Frontend will call place_bet with client-side encrypted BetInput from @arcium-hq/client (Phase 7)

</code_context>

<deferred>
## Deferred Ideas

- Encrypting individual positions (UserPosition amounts) — potential v2 enhancement for stronger individual privacy
- Batched epoch model (SCAL-01) to replace sequential lock for concurrent bets — v2 optimization
- Bet history/activity log per user — could be useful for portfolio view (Phase 9)

</deferred>

---

*Phase: 05-encrypted-betting*
*Context gathered: 2026-03-04*
