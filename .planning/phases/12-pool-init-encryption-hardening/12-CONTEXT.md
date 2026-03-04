# Phase 12: Pool Init & Encryption Hardening - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Ensure new markets have MPC-initialized pools before the first bet can be placed, and fix nonce reuse vulnerability in client-side encryption. Gap closure for INT-03 (init_pool not auto-triggered after create_market) and INT-05 (same nonce used for isYes and amount encryption).

</domain>

<decisions>
## Implementation Decisions

### init_pool trigger mechanism
- Frontend auto-chains `create_market` + `init_pool` as two sequential transactions
- New `useCreateMarket` hook encapsulates the full flow: create_market TX → init_pool TX
- Auto-retry init_pool up to 3 times on failure; show toast error only if all retries fail
- Fire-and-forget: hook resolves after init_pool TX is confirmed on-chain, does NOT wait for MPC callback to complete
- Market is created immediately; pool initializes asynchronously via MPC

### Uninitialized pool safety net
- UI gate on bet panel: check MarketPool ciphertext bytes; if all zeros (uninitialized), show "Market initializing..." with spinner instead of bet form
- Auto-refresh until pool state changes to valid encrypted data
- Permissionless recovery: if pool remains uninitialized after timeout (~30s), show an "Initialize Pool" button any user can click (init_pool has no access control — just needs a payer)

### Nonce fix
- Fix nonce reuse in `encryption.ts` — currently lines 53-54 pass the same nonce to both `cipher.encrypt` calls for isYes and amount
- Each ciphertext must use a unique nonce to prevent plaintext relationship leakage
- Audit all encrypt callsites across the frontend (useCastVote, JurorVotePanel, etc.) for the same issue

### Claude's Discretion
- Nonce generation strategy (separate random nonces vs sequential from base)
- On-chain nonce parameter approach (two nonces in place_bet signature vs derive second from first)
- Polling vs WebSocket subscription for pool initialization status detection
- Exact timeout duration before showing "Initialize Pool" recovery button

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key constraint is that the init_pool flow should feel seamless to the market creator (single "Create Market" action from their perspective).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `init_pool.rs` / `init_pool_callback.rs`: Complete on-chain instruction and callback already implemented (Phase 3)
- `init_pool_comp_def.rs`: Computation definition registration exists
- `encryptBetForMPC` in `encryption.ts`: The function to fix for nonce reuse
- `usePlaceBet.ts`: Reference pattern for Arcium account derivation, TX submission, exponential backoff retry
- `useOpenDispute.ts`: Reference pattern for chaining multiple TXs in a single hook flow

### Established Patterns
- Arcium account derivation via dynamic `@arcium-hq/client` import (usePlaceBet, useCastVote)
- Exponential backoff retry for MPC lock contention (BASE_DELAY_MS * 2^n)
- WebSocket subscription on PDA accounts for real-time MPC callback detection (market detail page)
- Toast notifications via sonner for TX status feedback

### Integration Points
- `useCreateMarket` hook will need all Arcium accounts for init_pool (12 accounts from InitPool struct)
- Bet panel (`BetPlacement.tsx`) needs pool initialization state check before rendering bet form
- `getBetPanelMode` state machine may need a new mode for "pool initializing"
- IDL (`avenir.ts`) may need regen if place_bet signature changes for dual nonces

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-pool-init-encryption-hardening*
*Context gathered: 2026-03-04*
