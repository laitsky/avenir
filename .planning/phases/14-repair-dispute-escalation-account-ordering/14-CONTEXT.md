# Phase 14: Repair Dispute Escalation Account Ordering - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the integration mismatch between `useOpenDispute` (frontend) and `open_dispute` (on-chain) so dispute escalation actually works. The on-chain instruction uses a slot-based seed for juror selection, making the ordering unpredictable to the client. The client passes resolver PDAs in registry order, but on-chain validates them against the shuffled selection order. This phase reconciles the two sides, updates tests, and re-verifies the full dispute lifecycle. Closes RES-03 and RES-06.

</domain>

<decisions>
## Implementation Decisions

### Juror selection seed
- Change the on-chain seed from `market.id ^ clock.slot` to a client-predictable value (e.g., `market.id` only or another deterministic combination)
- Keep the Fisher-Yates partial shuffle algorithm unchanged — only the seed changes
- Client replicates the exact same selection algorithm in TypeScript to derive ordering before TX submission
- Both sides must produce identical juror selection and ordering given the same seed and registry state

### On-chain contract modification
- Modify `open_dispute.rs` to use the new predictable seed — on-chain changes are acceptable
- On-chain validation stays strict: `remaining_accounts[i]` must match the expected juror PDA in exact order; no fallback reordering
- `anchor build` + IDL regeneration required after the seed change

### Client ordering logic
- `useOpenDispute` replicates the Fisher-Yates shuffle with the same seed to compute exact juror selection and ordering
- Passes only the 7 selected resolver PDAs as `remaining_accounts` in the computed order (not all resolvers)
- Registry-change race condition handling at Claude's discretion (simple retry on failure is likely sufficient given admin-only registry mutations)

### Testing strategy
- Update existing Phase 8 test cases (32 tests) to use the new seed
- Add new integration tests proving client-side ordering matches on-chain selection
- Both on-chain and frontend test suites updated

### Verification scope
- Full lifecycle verification: grace -> escalate -> vote -> finalize
- Include tiebreaker path: tie detection -> add_tiebreaker -> re-vote -> finalize
- Check MPC/DKG availability at verification time; use IDL-level assertions and local SDK tests if DKG still blocked (same approach as Phase 13)
- Update Phase 11 and Phase 8 verification artifacts to reflect the fix

### Claude's Discretion
- Exact predictable seed value (market.id alone, or combined with other deterministic fields)
- Race condition handling strategy for registry changes between fetch and TX execution
- Whether add_tiebreaker.rs also needs a seed change (inspect during research)
- MPC test gating approach if DKG is still blocked

</decisions>

<specifics>
## Specific Ideas

- Minimal diff philosophy: change the seed, replicate the algorithm client-side, keep everything else the same
- The admin-approved resolver pool (max 64) makes juror predictability a non-concern for v1
- Strict ordering validation is preferred over forgiving/reordering approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `open_dispute.rs` (lines 50-64): Fisher-Yates selection with LCG-style hash — seed change is a one-line modification
- `useOpenDispute.ts` (lines 108-113): Already builds `resolverAccounts` from registry — needs to add selection/ordering logic
- `getResolverPda` in `app/src/lib/pda.ts`: PDA derivation helper already exists
- `add_tiebreaker.rs`: May use similar selection logic — needs inspection for consistent seed change
- Phase 13 test patterns: Local x25519 key tests + MPC integration tests gated behind env flag

### Established Patterns
- Fisher-Yates partial shuffle with LCG hash for deterministic selection (on-chain)
- `remaining_accounts` pattern for passing variable resolver PDAs (on-chain)
- TanStack Query mutations with exponential backoff retry (frontend hooks)
- Phase 13's dual test approach: fast SDK tests + gated MPC integration tests

### Integration Points
- `open_dispute.rs` line 51: seed computation — primary on-chain change point
- `useOpenDispute.ts` lines 108-113: resolver account building — primary client change point
- `tests/` directory: Phase 8 dispute test suite needs seed update
- IDL regeneration after on-chain change (`anchor build`)
- Phase 11/8 verification artifacts need refresh

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-repair-dispute-escalation-account-ordering*
*Context gathered: 2026-03-06*
