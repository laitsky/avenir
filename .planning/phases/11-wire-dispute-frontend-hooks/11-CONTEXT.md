# Phase 11: Wire Dispute Frontend Hooks - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the dispute E2E flows by adding missing frontend hooks that call on-chain dispute instructions. Closes INT-01 (useOpenDispute), INT-02 (useFinalizeDispute), INT-06 (init_dispute_tally trigger) from the v1.0 milestone audit. Also wires the tiebreaker flow for tie scenarios. The on-chain instructions are fully implemented and tested — this phase is purely frontend hook creation and UI wiring.

</domain>

<decisions>
## Implementation Decisions

### init_dispute_tally sequencing
- Auto-chain after open_dispute TX succeeds — single user action triggers two TXs
- 2-step inline progress indicator: "Escalating..." (step 1/2) → "Initializing vote tally..." (step 2/2) → success toast
- If init_dispute_tally fails after open_dispute succeeded: show error toast with retry button (dispute already open on-chain, tally init is idempotent)
- Escalate button only visible to connected wallets with a UserPosition on the market (matches on-chain requirement)

### Finalize dispute trigger
- Manual "Reveal Outcome" button — mirrors existing "Reveal Payouts" pattern from resolution flow
- Button visible to anyone visiting the page once quorum reached (5/7 votes); wallet connect prompt on click since TX needs a signer
- During MPC processing: inline progress ("Revealing outcome...") with fog intensification effect, then fog-clear animation when callback lands via websocket
- Fog-clear reveals "Jury decided: YES/NO" with outcome badge, market transitions to resolved state

### Resolver account resolution
- Fetch ResolverRegistry PDA on-chain to get all active resolvers
- Pass all active resolver PDAs as remaining_accounts — on-chain program handles juror selection from the list
- Inline fetch inside useOpenDispute mutation function (no separate hook — resolver data only needed during escalation)
- Pre-check resolver count before showing escalate button: if < 7 active resolvers, disable button with tooltip "Not enough resolvers available (X/7 required)"

### Error & edge case handling
- Same exponential backoff for MPC lock contention as usePlaceBet (5 attempts: 2s, 4s, 8s, 16s, 32s) with "Dispute busy — retrying..." + attempt count
- Voting window expiry without quorum: show "Voting ended — quorum not reached (X/5 required)" info state
- Tie scenario: wire useAddTiebreaker hook — when dispute resets to Voting after tie, show "Tie detected — selecting tiebreaker juror" and auto-trigger add_tiebreaker
- Regenerate IDL via anchor build to include all dispute instructions (openDispute, initDisputeTally, finalizeDispute, addTiebreaker) for type-safe method calls

### Claude's Discretion
- Exact toast notification copy and timing
- ResolverRegistry account structure parsing details
- Websocket subscription management for dispute state changes (can reuse useDisputeData patterns)
- Tiebreaker juror selection UX details beyond "auto-trigger"
- Any additional PDA derivation helpers needed

</decisions>

<specifics>
## Specific Ideas

- 2-step progress for escalation mirrors the bet placement multi-step UX — users learn to expect multi-TX flows in this app
- "Reveal Outcome" button mirrors "Reveal Payouts" — consistent language for permissionless MPC reveal actions
- Fog intensification during MPC wait creates anticipation before the reveal — "fog churning" effect
- Pre-checking resolver count prevents frustrating failed TXs and educates users about the resolver pool requirement

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useCastVote` hook (`app/src/hooks/useCastVote.ts`): Fully implemented dispute hook — reference pattern for PDA derivation, Arcium accounts, toast notifications
- `usePlaceBet` hook (`app/src/hooks/usePlaceBet.ts`): Reference for multi-step progress, exponential backoff retry, MPC lock contention handling
- `useComputePayouts` hook (`app/src/hooks/useComputePayouts.ts`): Reference for permissionless MPC reveal — finalize_dispute follows same pattern
- `useDisputeData` hook (`app/src/hooks/useDisputeData.ts`): Fetches Dispute PDA with websocket subscription — already handles all dispute state changes
- `BetPlacement.tsx` modes: DisputeEscalateMode (lines 657-709) and DisputeFinalizedMode (lines 754-787) are UI shells ready for hook wiring
- `FogOverlay` component: density + revealed props for fog intensification and clear effects
- PDA helpers (`app/src/lib/pda.ts`): getDisputePda, getDisputeTallyPda, getResolverPda already exist

### Established Patterns
- TanStack Query mutations with onSuccess/onError callbacks for all transaction hooks
- Dynamic `@arcium-hq/client` import for browser compatibility
- computationOffset via `crypto.getRandomValues()` for Arcium MPC queue
- Toast notifications with Solscan transaction links
- getBetPanelMode state machine in BetPlacement.tsx (12 modes including 4 dispute modes)

### Integration Points
- IDL needs regeneration — current IDL missing dispute instructions (openDispute, castVote, initDisputeTally, finalizeDispute, addTiebreaker)
- DisputeEscalateMode.handleEscalate() at BetPlacement.tsx:668-677 — replace no-op with useOpenDispute call
- DisputeFinalizedMode — add "Reveal Outcome" button that calls useFinalizeDispute
- On-chain instructions fully implemented: open_dispute.rs, init_dispute_tally.rs, finalize_dispute.rs, add_tiebreaker.rs

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-wire-dispute-frontend-hooks*
*Context gathered: 2026-03-04*
