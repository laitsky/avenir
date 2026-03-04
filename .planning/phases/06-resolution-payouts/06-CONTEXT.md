# Phase 6: Resolution & Payouts - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Market creators can declare the winning outcome and winning bettors receive instant proportional USDC payouts with protocol fee deducted. This phase builds resolve_market, compute_payouts MPC circuit, compute_payouts_callback, and claim_payout instructions. Dispute escalation and encrypted jury voting are Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Resolution flow
- Two-step process: resolve_market (creator declares winner) → compute_payouts (anyone triggers MPC reveal)
- resolve_market sets Market.state = Resolved (2) and Market.winning_outcome (1=Yes, 2=No)
- compute_payouts is permissionless — any account can trigger it on a Resolved market
- resolve_market checks mpc_lock — rejects if a bet is in-flight (market must be quiescent)
- Creator can resolve anytime after resolution_time (deadline). No upper time limit in Phase 6 — the 48h grace period and dispute escalation are Phase 8's concern

### Payout claim mechanism
- Pull model: each winner calls claim_payout individually
- claim_payout requires compute_payouts to have completed (state = Finalized)
- 2% protocol fee (200 basis points) deducted per-winner from each claim_payout
- Fee sent to config_fee_recipient (snapshotted on Market at creation) during each claim
- UserPosition.claimed set to true after successful claim — prevents double-claim

### Revealed pool storage
- compute_payouts MPC circuit takes encrypted PoolTotals, returns plaintext [yes_pool, no_pool] — minimal MPC complexity
- Revealed totals stored as new fields on Market: revealed_yes_pool (u64), revealed_no_pool (u64)
- Reuse existing mpc_lock for compute_payouts — same lock/unlock pattern as update_pool
- New Market.state value: Finalized (4) — set by compute_payouts_callback after writing revealed pools
- State flow: Open (0) → Resolved (2) → Finalized (4). Claims only accepted at Finalized (4)

### Edge case policy
- All bets on winning side (losing_pool = 0): winners get original bet back minus 2% fee
- Rounding: floor individual payouts, dust stays in market vault (immaterial amounts)
- Losers: explicit rejection with NoWinningPosition error when calling claim_payout
- No claim expiry: winners can claim indefinitely after finalization. No sweep/recovery logic for v1

### Claude's Discretion
- compute_payouts circuit implementation details (input/output types, Arcis patterns)
- compute_payouts_callback account struct ordering
- Exact payout formula implementation (proportional share math)
- Error message wording for resolution/claim rejection cases
- Test structure and coverage strategy
- Whether resolve_market needs a separate state transition (e.g., Locked=1) before Resolved=2

</decisions>

<specifics>
## Specific Ideas

- Payout formula: `user_payout = (user_winning_amount * total_pool / winning_pool) - fee`
- total_pool = revealed_yes_pool + revealed_no_pool
- winning_pool = revealed_yes_pool if winning_outcome=Yes, else revealed_no_pool
- Fee = user_payout * config_fee_bps / 10000
- resolve_market only validates: caller is market creator, state is Open, deadline has passed, mpc_lock is false
- compute_payouts_callback writes revealed_yes_pool, revealed_no_pool, sets state=Finalized, clears mpc_lock

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `update_pool` circuit pattern (`encrypted-ixs/src/lib.rs`): compute_payouts follows same Enc<Mxe, PoolTotals> input pattern, but returns revealed plaintext instead of re-encrypted
- `update_pool_callback` struct (`instructions/mpc/update_pool_callback.rs`): Template for compute_payouts_callback account validation
- `Market` struct (`state/market.rs`): Already has winning_outcome, state, config_fee_bps, config_fee_recipient — needs revealed_yes_pool, revealed_no_pool fields added
- `UserPosition` struct (`state/user_position.rs`): Has claimed field ready for payout tracking
- `MarketPool` struct (`state/market_pool.rs`): Encrypted pool state at offset 16, length 64 — compute_payouts reads from here
- `AvenirError` enum (`errors.rs`): Needs new variants: MarketNotResolved, MarketNotFinalized, NoWinningPosition, AlreadyClaimed, NotMarketCreator
- MPC callback pattern: `#[callback_accounts("circuit_name")]` macro, ArgBuilder.account() for ciphertext reads
- SPL Token transfer CPI pattern from place_bet — reusable for vault → winner transfers in claim_payout

### Established Patterns
- Anchor 0.32.1 with `#[account]`, `#[derive(InitSpace)]`, PDA seeds
- `#[arcium_program]` for MPC-integrated instructions
- Handler functions separated from account validation structs
- MPC callback: set mpc_lock before, clear on both success and failure paths
- ArgBuilder.account() at offset 16, length 64 for MarketPool ciphertext

### Integration Points
- Market vault PDA `[b"vault", market_id.to_le_bytes()]` with Market PDA as authority — claim_payout transfers from vault to winner
- `init_update_pool_comp_def` pattern for registering compute_payouts circuit with Arcium
- Frontend will call resolve_market + compute_payouts in Phase 7 UI integration
- Phase 8 dispute system builds on Market.state — needs Finalized(4) to coexist with Disputed(3)

</code_context>

<deferred>
## Deferred Ideas

- Claim expiry with unclaimed fund recovery (sweep to protocol) — potential v2 enhancement
- Batch payout distribution (push model) — not feasible on Solana for v1 due to account limits
- Per-user payout computation inside MPC — overkill, RES-09 specifies plaintext math after reveal

</deferred>

---

*Phase: 06-resolution-payouts*
*Context gathered: 2026-03-04*
