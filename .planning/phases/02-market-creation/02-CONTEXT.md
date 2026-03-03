# Phase 2: Market Creation - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Whitelisted addresses can create binary markets with question, outcomes, deadline, category, and resolution source. Markets enforce deadline-based bet rejection on-chain. Market creation instruction, whitelist management, and deadline validation. Betting, resolution, and disputes are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Whitelist mechanism
- Separate CreatorWhitelist PDA per approved creator address
- Admin-only management — only Config admin can add/remove creators
- Minimal metadata: creator pubkey, active flag, bump
- Removing a creator from whitelist does NOT affect their existing markets — only prevents new market creation
- create_market instruction checks CreatorWhitelist PDA exists and is active

### Resolution source
- Free-text URL/reference field added to Market struct (e.g., "https://reuters.com" or "Official NBA results")
- Required on market creation — cannot be empty
- Immutable after creation — no updates allowed, prevents bait-and-switch after bets are placed

### Market lifecycle
- `resolution_time` = bet cutoff time (when betting closes), NOT resolution deadline
- Creator has 48h grace period AFTER resolution_time to resolve (enforced in Phase 6)
- No crank or explicit lock instruction — place_bet checks `clock.unix_timestamp > resolution_time` and rejects
- Market state stays Open until explicitly resolved (state field used by later phases for Locked/Resolved/Disputed)
- Creator can cancel market and reclaim rent ONLY if total_bets == 0 — once someone bets, market must play out
- Protocol pause (Config.paused = true) blocks ALL instructions including market creation

### Creation constraints
- No creation fee beyond standard Solana rent (~0.003 SOL for Market PDA + vault)
- No maximum deadline duration — markets can be years out
- No per-creator market limit — whitelist curation is the quality gate
- Rent payer: market creator pays for Market PDA and vault token account allocation

### Claude's Discretion
- Resolution source field length (within reasonable bounds for on-chain storage)
- Minimum deadline duration (must be reasonable, e.g., 1h minimum)
- Whitelist instruction design (separate add/remove vs toggle pattern)
- Exact create_market instruction parameter ordering and validation sequence
- Error message wording for rejection cases

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Anchor patterns for instruction design and validation.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Market` struct (state/market.rs): Already has id, question, category, resolution_time, state, winning_outcome, encrypted pools, sentiment, total_bets, creator, created_at, config_fee_recipient, config_fee_bps, mpc_lock, bump, vault_bump — needs `resolution_source` field added
- `Config` struct (state/config.rs): Has admin, fee_recipient, usdc_mint, protocol_fee_bps, market_counter, paused, bump — market_counter used for auto-incrementing market IDs
- `AvenirError` enum (errors.rs): Has InvalidMint, Unauthorized, MarketNotOpen, InvalidCategory, QuestionTooLong — needs new variants for whitelist/deadline/pause errors
- `Initialize` instruction (instructions/initialize.rs): Establishes the Config PDA pattern — new instructions follow this Anchor style

### Established Patterns
- Anchor 0.32.1 with `#[account]`, `#[derive(InitSpace)]`, PDA seeds pattern
- Config PDA seeded by `[b"config"]` with bump
- Handler functions separated from account validation structs
- `InitSpace` derive for automatic space calculation

### Integration Points
- `Config.market_counter` incremented on each create_market to generate market IDs
- `Config.paused` checked at instruction entry for emergency stop
- Market PDA seeded by `[b"market", market_id.to_le_bytes()]`
- MarketVault PDA seeded by `[b"vault", market_id.to_le_bytes()]` — SPL token account for USDC
- New `CreatorWhitelist` PDA seeded by `[b"whitelist", creator.key()]`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-market-creation*
*Context gathered: 2026-03-03*
