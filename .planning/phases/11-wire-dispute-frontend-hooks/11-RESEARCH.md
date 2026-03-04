# Phase 11: Wire Dispute Frontend Hooks - Research

**Researched:** 2026-03-04
**Domain:** Solana/Anchor frontend hook wiring, TanStack Query mutations, Arcium MPC queuing
**Confidence:** HIGH

## Summary

Phase 11 is a frontend-only wiring phase. All four on-chain instructions (`open_dispute`, `init_dispute_tally`, `finalize_dispute`, `add_tiebreaker`) are fully implemented and tested in the Anchor program. The IDL in `target/idl/avenir.json` already contains all dispute instructions. The task is to: (1) copy the updated IDL into the app, (2) create three new hooks (`useOpenDispute`, `useFinalizeDispute`, `useAddTiebreaker`), and (3) wire them into the existing UI shells in `BetPlacement.tsx`.

The codebase has well-established patterns for every aspect of this work. `useCastVote` is the closest reference for PDA derivation and Arcium account setup in dispute context. `usePlaceBet` is the reference for multi-step progress UX and exponential backoff retry. `useComputePayouts` is the reference for permissionless MPC queue instructions (no encryption needed). The `getBetPanelMode` state machine already routes to `DisputeEscalateMode` and `DisputeFinalizedMode` -- both are UI shells with placeholder/incomplete logic that need hook integration.

**Primary recommendation:** Copy the established hook patterns exactly -- this is mechanical wiring, not architectural design. The biggest complexity is the 2-step transaction chaining in `useOpenDispute` (open_dispute then init_dispute_tally), which should use sequential awaits with step-tracking state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **init_dispute_tally sequencing**: Auto-chain after open_dispute TX succeeds -- single user action triggers two TXs. 2-step inline progress indicator: "Escalating..." (step 1/2) then "Initializing vote tally..." (step 2/2) then success toast. If init_dispute_tally fails after open_dispute succeeded: show error toast with retry button (dispute already open on-chain, tally init is idempotent). Escalate button only visible to connected wallets with a UserPosition on the market (matches on-chain requirement).
- **Finalize dispute trigger**: Manual "Reveal Outcome" button -- mirrors existing "Reveal Payouts" pattern from resolution flow. Button visible to anyone visiting the page once quorum reached (5/7 votes); wallet connect prompt on click since TX needs a signer. During MPC processing: inline progress ("Revealing outcome...") with fog intensification effect, then fog-clear animation when callback lands via websocket. Fog-clear reveals "Jury decided: YES/NO" with outcome badge, market transitions to resolved state.
- **Resolver account resolution**: Fetch ResolverRegistry PDA on-chain to get all active resolvers. Pass all active resolver PDAs as remaining_accounts -- on-chain program handles juror selection from the list. Inline fetch inside useOpenDispute mutation function (no separate hook -- resolver data only needed during escalation). Pre-check resolver count before showing escalate button: if < 7 active resolvers, disable button with tooltip "Not enough resolvers available (X/7 required)".
- **Error & edge case handling**: Same exponential backoff for MPC lock contention as usePlaceBet (5 attempts: 2s, 4s, 8s, 16s, 32s) with "Dispute busy -- retrying..." + attempt count. Voting window expiry without quorum: show "Voting ended -- quorum not reached (X/5 required)" info state. Tie scenario: wire useAddTiebreaker hook -- when dispute resets to Voting after tie, show "Tie detected -- selecting tiebreaker juror" and auto-trigger add_tiebreaker. Regenerate IDL via anchor build to include all dispute instructions for type-safe method calls.

### Claude's Discretion
- Exact toast notification copy and timing
- ResolverRegistry account structure parsing details
- Websocket subscription management for dispute state changes (can reuse useDisputeData patterns)
- Tiebreaker juror selection UX details beyond "auto-trigger"
- Any additional PDA derivation helpers needed

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RES-03 | After grace period, any market participant can trigger dispute escalation | `useOpenDispute` hook calls `open_dispute` instruction; on-chain validates UserPosition existence and grace period expiry. DisputeEscalateMode UI shell already exists at BetPlacement.tsx:657-709. |
| RES-05 | Resolver votes are encrypted via Arcium MPC (no juror sees other votes) | Already implemented via `useCastVote` hook (Phase 8). This phase wires `init_dispute_tally` (initializes encrypted zero state required before votes can accumulate) and `finalize_dispute` (reveals encrypted vote totals). |
| RES-06 | Dispute outcome is determined by stake-weighted encrypted vote tally | `useFinalizeDispute` hook calls `finalize_dispute` instruction which queues MPC computation to decrypt and reveal vote totals. The callback resolves the market based on majority. Tie detection triggers `add_tiebreaker` flow via `useAddTiebreaker`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @coral-xyz/anchor | 0.30.x | Typed Solana program interaction | Already used by all hooks; provides Program<Avenir> type |
| @tanstack/react-query | 5.x | Mutation + cache invalidation | Already used by usePlaceBet/useComputePayouts for all TX hooks |
| @solana/web3.js | 1.x | PublicKey, SystemProgram, Transaction | Already used everywhere |
| @arcium-hq/client | 0.8.5 | Arcium MPC account derivation (no encryption needed for these hooks) | Already used by useCastVote, usePlaceBet, useComputePayouts |
| sonner | 1.x | Toast notifications with Solscan links | Already used by all transaction hooks |
| bn.js | 5.x | BN type for computation_offset | Already used by all Arcium-related hooks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @solana/wallet-adapter-react | 0.15.x | useWallet, useConnection hooks | Already used; needed for publicKey and connection |

### Alternatives Considered
None -- this phase uses only existing project dependencies. No new libraries needed.

**Installation:**
No new packages to install. All dependencies are already in `app/package.json`.

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── hooks/
│   ├── useOpenDispute.ts        # NEW: open_dispute + init_dispute_tally 2-TX chain
│   ├── useFinalizeDispute.ts    # NEW: finalize_dispute MPC queue
│   ├── useAddTiebreaker.ts      # NEW: add_tiebreaker for tie scenarios
│   ├── useResolverRegistry.ts   # NEW: fetch registry for pre-check (resolver count)
│   ├── useCastVote.ts           # EXISTING: reference pattern
│   ├── useComputePayouts.ts     # EXISTING: reference pattern
│   ├── usePlaceBet.ts           # EXISTING: reference pattern
│   └── useDisputeData.ts        # EXISTING: websocket subscription
├── components/
│   └── market/
│       └── BetPlacement.tsx     # MODIFY: wire hooks into DisputeEscalateMode, DisputeFinalizedMode
├── lib/
│   ├── idl/
│   │   ├── avenir.json          # REPLACE: copy from target/idl/avenir.json
│   │   └── avenir.ts            # REGENERATE: TypeScript types from new IDL
│   └── pda.ts                   # EXISTING: all dispute PDAs already defined
```

### Pattern 1: Transaction Hook with TanStack Mutation (useComputePayouts reference)
**What:** Permissionless MPC queue instruction (no user-encrypted input)
**When to use:** `useFinalizeDispute` -- same pattern as `useComputePayouts`
**Example:**
```typescript
// Source: app/src/hooks/useComputePayouts.ts (existing code)
export function useFinalizeDispute(marketId: number) {
  const program = useAnchorProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Derive PDAs: dispute, disputeTally, market
      // Dynamic import @arcium-hq/client for Arcium account derivation
      // getCompDefAccOffset('finalize_dispute') for comp def index
      // program.methods.finalizeDispute(computationOffset).accounts({...}).rpc()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', marketId] })
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
      toast.success('Outcome revealed -- fog clearing!')
    },
  })
}
```

### Pattern 2: Multi-Step Transaction Chain (usePlaceBet reference)
**What:** Two sequential transactions with step-tracking state
**When to use:** `useOpenDispute` -- open_dispute then init_dispute_tally
**Example:**
```typescript
// Source: app/src/hooks/usePlaceBet.ts step tracking pattern
export type EscalateStep = 'idle' | 'escalating' | 'initializing-tally' | 'retrying' | 'success' | 'error'

export function useOpenDispute(marketId: number) {
  const [step, setStep] = useState<EscalateStep>('idle')

  const mutation = useMutation({
    mutationFn: async () => {
      // Step 1: open_dispute
      setStep('escalating')
      // ... send open_dispute TX with remaining_accounts (resolver PDAs)

      // Step 2: init_dispute_tally (auto-chained)
      setStep('initializing-tally')
      // ... send init_dispute_tally TX (MPC queue, no encryption)
    }
  })
}
```

### Pattern 3: Remaining Accounts for Resolver PDAs (on-chain pattern)
**What:** Passing resolver PDAs as `remainingAccounts` to open_dispute
**When to use:** `useOpenDispute` only -- resolvers needed for juror selection
**Example:**
```typescript
// Source: programs/avenir/src/instructions/open_dispute.rs (on-chain code)
// The instruction expects remaining_accounts to contain Resolver PDA AccountInfos
// for each selected juror. On-chain, it uses ALL registry resolvers for selection
// then validates passed remaining_accounts match selected juror PDAs.

// Frontend approach: fetch ResolverRegistry, derive Resolver PDA for each entry
const [registryPda] = getResolverRegistryPda()
const registry = await program.account.resolverRegistry.fetch(registryPda)

const resolverPdas = registry.resolvers.map(wallet => {
  const [pda] = getResolverPda(wallet)
  return { pubkey: pda, isSigner: false, isWritable: true }
})

// Pass as remainingAccounts
await program.methods.openDispute()
  .accounts({ ... })
  .remainingAccounts(resolverPdas)
  .rpc()
```

### Pattern 4: Websocket-Driven State Transitions (existing pattern)
**What:** Using on-chain account change subscriptions to detect MPC callback completion
**When to use:** DisputeFinalizedMode fog-clear animation, tiebreaker auto-trigger
**Example:**
```typescript
// Source: app/src/hooks/useDisputeData.ts (existing code)
// Already subscribes to dispute PDA changes via connection.onAccountChange
// When finalize_dispute_callback fires, dispute.status changes from 1->2 (or 1->0 for tie)
// The websocket subscription in useDisputeData auto-invalidates the query
// MarketDetail.tsx already detects state transitions via prevStateRef pattern
```

### Pattern 5: Arcium Account Derivation (all MPC hooks)
**What:** Standard boilerplate for deriving Arcium program accounts
**When to use:** Every hook that calls an MPC-gated instruction
**Example:**
```typescript
// Source: app/src/hooks/useComputePayouts.ts (existing code)
// This exact block is copied into every MPC hook -- it's deliberate duplication
const {
  getComputationAccAddress, getClusterAccAddress, getMXEAccAddress,
  getMempoolAccAddress, getExecutingPoolAccAddress, getCompDefAccAddress,
  getCompDefAccOffset, getArciumEnv, getFeePoolAccAddress,
  getClockAccAddress, getArciumProgramId,
} = await import('@arcium-hq/client')

const arciumEnv = getArciumEnv()
const clusterOffset = arciumEnv.arciumClusterOffset
const compDefIndex = Buffer.from(
  getCompDefAccOffset('finalize_dispute') // <-- circuit name varies per hook
).readUInt32LE(0)
```

### Anti-Patterns to Avoid
- **Creating a shared Arcium accounts helper:** Each hook uses a different circuit name for `getCompDefAccOffset`. The existing pattern deliberately duplicates the block in each hook for clarity and independence. Do not extract this into a shared function.
- **Separate useResolverRegistry fetch in useOpenDispute:** The CONTEXT.md locks "inline fetch inside useOpenDispute mutation function." Do not create a separate hook for resolver data that gets called on mount -- only fetch during escalation action.
- **Using useMutation for the 2-step chain in useOpenDispute:** The usePlaceBet pattern uses useMutation with step state. However, useOpenDispute has two sequential transactions. The mutation should contain both TX calls sequentially -- do NOT nest mutations.
- **Polling for MPC callback completion:** Websocket subscriptions (already in useDisputeData) handle real-time updates. Never poll.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDA derivation | Custom seed hashing | Existing `pda.ts` helpers (getDisputePda, getDisputeTallyPda, getResolverPda, getResolverRegistryPda) | All dispute PDAs already exist in pda.ts |
| Arcium account derivation | Custom address computation | `@arcium-hq/client` SDK functions (getMXEAccAddress, etc.) | Complex PDA math handled by SDK |
| Transaction confirmation | Manual polling | Anchor `.rpc({ commitment: 'confirmed' })` | Anchor handles confirmation internally |
| Real-time state updates | Polling interval | `useDisputeData` websocket subscription | Already implemented, auto-invalidates queries |
| Exponential backoff | Custom retry logic | Copy exact pattern from usePlaceBet.ts onError handler | Already debugged and tested |

**Key insight:** Every building block for this phase already exists in the codebase. The work is purely wiring existing patterns to new instruction calls.

## Common Pitfalls

### Pitfall 1: Stale IDL Missing Dispute Instructions
**What goes wrong:** TypeScript compilation fails because `program.methods.openDispute` does not exist on the typed Program<Avenir> interface.
**Why it happens:** The app's IDL copy at `app/src/lib/idl/avenir.json` was last updated before Phase 8 added dispute instructions. The target IDL has them but the app copy does not.
**How to avoid:** First task must copy `target/idl/avenir.json` to `app/src/lib/idl/avenir.json` and regenerate the TypeScript types file `avenir.ts`. Verify `openDispute`, `initDisputeTally`, `finalizeDispute`, `addTiebreaker` appear in the generated types before writing any hooks.
**Warning signs:** `Property 'openDispute' does not exist on type` error.

### Pitfall 2: Remaining Accounts Ordering for open_dispute
**What goes wrong:** On-chain validation fails because remaining_accounts don't match the resolver PDAs expected by the deterministic juror selection algorithm.
**Why it happens:** The on-chain `open_dispute` selects 7 jurors from the registry deterministically and then iterates remaining_accounts expecting them in the same order. The frontend must pass ALL resolver PDAs (not just 7), because the on-chain code uses `remaining_accounts[i]` indexed against the selected jurors.
**How to avoid:** Pass ALL registry resolver PDAs as remaining_accounts in the same order they appear in `resolver_registry.resolvers`. The on-chain code iterates over its selected juror indices and indexes into remaining_accounts at those positions.
**Warning signs:** `NotMarketParticipant` error from open_dispute (reused error code for invalid resolver account).

### Pitfall 3: init_dispute_tally Uses Different Circuit Name
**What goes wrong:** MPC queue fails because the computation definition account doesn't match.
**Why it happens:** `init_dispute_tally` is a separate circuit from `finalize_dispute`. Each circuit has its own comp def offset. Using `getCompDefAccOffset('init_dispute_tally')` is required -- not `finalize_dispute` or `add_dispute_vote`.
**How to avoid:** Verify the circuit name string matches exactly: `'init_dispute_tally'` for the tally init, `'finalize_dispute'` for the finalize step.
**Warning signs:** Arcium `InvalidComputationDefinition` error.

### Pitfall 4: DisputeFinalizedMode Currently Calls computePayouts Instead of finalizeDispute
**What goes wrong:** The current `DisputeFinalizedMode` component calls `useComputePayouts`, which queues the wrong MPC computation. It should call `useFinalizeDispute` to reveal the DISPUTE vote tally, not the market pool totals.
**Why it happens:** Phase 8 wired a placeholder that reused the payout computation. The CONTEXT.md clarifies the flow: finalize_dispute reveals the dispute outcome, then after market transitions to Resolved, compute_payouts reveals pool totals.
**How to avoid:** Replace `useComputePayouts` with `useFinalizeDispute` in `DisputeFinalizedMode`. The market will transition: Disputed(3) -> finalize_dispute -> callback sets state=2(Resolved) or tie -> then user triggers compute_payouts via RevealPayoutsMode.
**Warning signs:** Dispute settles but market tries to compute payouts while still in state 3 (on-chain constraint: market.state must be 2 for compute_payouts).

### Pitfall 5: getBetPanelMode Does Not Handle Quorum-Reached-But-Not-Finalized
**What goes wrong:** The "Reveal Outcome" button is never visible because `dispute.status === 2` (Settled) is checked, but finalization hasn't happened yet -- it's still `status === 0` (Voting) with `vote_count >= quorum`.
**Why it happens:** The current mode state machine maps `dispute.status === 2` to `dispute-finalized`. But the user needs to see the "Reveal Outcome" button when quorum is reached (`vote_count >= quorum`) and status is still 0 (Voting).
**How to avoid:** Update `getBetPanelMode` to check `dispute.vote_count >= dispute.quorum && dispute.status === 0` and route to a mode where the "Reveal Outcome" button is shown. The existing `dispute-finalized` mode name is misleading -- it should mean "ready to finalize" not "already finalized."
**Warning signs:** Users can never trigger finalization because the UI doesn't show the button.

### Pitfall 6: Tie Detection Requires Monitoring dispute.status Revert
**What goes wrong:** After `finalize_dispute_callback` detects a tie, dispute.status reverts from 1 (Finalizing) back to 0 (Voting). If the frontend doesn't detect this, the user sees a stuck "Finalizing" state.
**Why it happens:** The tie case in `finalize_dispute_callback` sets `dispute.status = 0` (back to Voting) without setting `dispute.tiebreaker_added = true`. The `add_tiebreaker` instruction must be called separately.
**How to avoid:** After `finalize_dispute` mutation succeeds, monitor the dispute via the websocket subscription. If `dispute.status` reverts to 0 AND `dispute.tiebreaker_added === false` AND `dispute.vote_count >= dispute.quorum`, this signals a tie. Auto-trigger `useAddTiebreaker`.
**Warning signs:** Dispute appears to go back to "Voting" state after finalization attempt.

## Code Examples

Verified patterns from existing codebase:

### open_dispute Account Structure (from on-chain code)
```typescript
// Source: programs/avenir/src/instructions/open_dispute.rs
// Required accounts:
{
  escalator: publicKey,          // Signer, mut (pays for PDA init)
  market: marketPda,             // mut (state transitions to 3)
  userPosition: positionPda,     // read-only (validates participant)
  resolverRegistry: registryPda, // read-only (for juror selection)
  dispute: disputePda,           // init (created by instruction)
  disputeTally: disputeTallyPda, // init (created by instruction)
  systemProgram: SystemProgram.programId,
}
// PLUS remaining_accounts: all Resolver PDAs from registry (writable)
```

### init_dispute_tally Account Structure (from on-chain code)
```typescript
// Source: programs/avenir/src/instructions/mpc/init_dispute_tally.rs
// Required accounts (MPC queue pattern):
{
  payer: publicKey,              // Signer, mut
  dispute: disputePda,           // read-only (validates status)
  disputeTally: disputeTallyPda, // read-only (callback will write)
  ...arciumAccounts,             // Standard Arcium accounts
  systemProgram: SystemProgram.programId,
  arciumProgram: getArciumProgramId(),
}
// compDefAccOffset: 'init_dispute_tally'
```

### finalize_dispute Account Structure (from on-chain code)
```typescript
// Source: programs/avenir/src/instructions/mpc/finalize_dispute.rs
// Required accounts (MPC queue pattern):
{
  payer: publicKey,              // Signer, mut (anyone can trigger)
  dispute: disputePda,           // mut (status + MPC lock)
  disputeTally: disputeTallyPda, // read-only (encrypted vote data)
  market: marketPda,             // mut (callback resolves market)
  ...arciumAccounts,             // Standard Arcium accounts
  systemProgram: SystemProgram.programId,
  arciumProgram: getArciumProgramId(),
}
// compDefAccOffset: 'finalize_dispute'
```

### add_tiebreaker Account Structure (from on-chain code)
```typescript
// Source: programs/avenir/src/instructions/add_tiebreaker.rs
// Required accounts (NO MPC -- plain instruction):
{
  payer: publicKey,              // Signer, mut (anyone can trigger)
  dispute: disputePda,           // mut (adds juror, extends window)
  market: marketPda,             // read-only (validates state=3)
  resolverRegistry: registryPda, // read-only (for tiebreaker selection)
}
// remaining_accounts: 1 Resolver PDA (the new tiebreaker juror, writable)
// Note: frontend doesn't know which resolver will be selected -- pass ALL
// non-juror resolver PDAs? No -- on-chain selects deterministically.
// The remaining_accounts[0] must be the PDA for the selected resolver.
// This is a challenge: the frontend needs to replicate the deterministic
// selection to know which single Resolver PDA to pass.
```

### Exponential Backoff Pattern (from usePlaceBet)
```typescript
// Source: app/src/hooks/usePlaceBet.ts:190-211
onError: async (error, variables) => {
  const errorMsg = error instanceof Error ? error.message : String(error)
  const isLockError =
    errorMsg.includes('MarketLocked') ||
    errorMsg.includes('MpcLocked') ||
    errorMsg.includes('mpc_lock')

  if (isLockError && retryCount < MAX_RETRIES) {
    setStep('retrying')
    const newRetryCount = retryCount + 1
    setRetryCount(newRetryCount)
    const delay = BASE_DELAY_MS * Math.pow(2, newRetryCount - 1)
    await new Promise((resolve) => setTimeout(resolve, delay))
    queryClient.invalidateQueries({ queryKey: ['market', marketId] })
    mutation.mutate(variables)
    return
  }
  // ... error handling
}
```

### Resolver Registry Fetch Pattern
```typescript
// Source: Derived from existing codebase patterns
// ResolverRegistry PDA: seeds = [b"resolver_registry"]
// ResolverRegistry has: resolvers: Vec<Pubkey>, bump: u8

const [registryPda] = getResolverRegistryPda()
const registry = await program.account.resolverRegistry.fetch(registryPda)
// registry.resolvers is Pubkey[] of active resolver wallet addresses
// registry.resolvers.length is the resolver count for pre-check
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DisputeFinalizedMode uses useComputePayouts | Must use useFinalizeDispute | Phase 11 | Wrong MPC computation was wired; finalize_dispute reveals vote tally, compute_payouts reveals pool totals |
| App IDL missing dispute instructions | Updated IDL from target/idl | Phase 11 | TypeScript types need regeneration for type-safe dispute method calls |
| DisputeEscalateMode is a no-op placeholder | Wires useOpenDispute + init_dispute_tally chain | Phase 11 | Completes INT-01 (useOpenDispute) and INT-06 (init_dispute_tally auto-trigger) |

**Deprecated/outdated:**
- The current `DisputeFinalizedMode` implementation is wrong -- it calls `useComputePayouts` instead of a finalize dispute hook. This must be replaced entirely.

## Open Questions

1. **add_tiebreaker remaining_accounts determinism**
   - What we know: The on-chain `add_tiebreaker` selects 1 tiebreaker juror deterministically from the registry using `market_id.wrapping_mul(...) ^ clock.slot ^ vote_count`. It expects `remaining_accounts[0]` to be that specific Resolver PDA.
   - What's unclear: The frontend cannot predict `clock.slot` at the time the transaction will be processed. The slot used on-chain may differ from what the frontend calculates.
   - Recommendation: Pass ALL non-juror Resolver PDAs as remaining_accounts (same pattern as open_dispute). The on-chain code only reads `remaining_accounts.first()`, so if only one is passed, it must be the correct one. Since we can't predict the on-chain slot, we have two options: (a) pass all non-juror resolver PDAs and modify the on-chain code to iterate, or (b) accept that the deterministic selection is slot-dependent and handle potential failure with retry. **Given that the on-chain code is locked (Phase 8 complete), option (b) is the path forward.** However, looking more closely at the code: `remaining_accounts.first()` returns the FIRST one passed. The on-chain code calculates `selected_idx` from the registry, finds the pubkey, then validates `remaining_accounts[0].key() == expected_pda`. So the frontend MUST pass the correct single PDA. Since `clock.slot` is unpredictable, the safest approach is to simulate the transaction first to determine which resolver is selected, or simply pass ALL non-juror resolver PDAs and accept that only `remaining_accounts[0]` is read. The on-chain code validates the PDA -- if it doesn't match, the TX fails with `NotSelectedJuror`. A retry with updated slot should eventually succeed. In practice, auto-triggering add_tiebreaker may require 1-2 attempts.

2. **DisputeFinalizedMode flow after finalize_dispute**
   - What we know: After `finalize_dispute_callback` runs, if there's a winner, market.state transitions from 3 (Disputed) to 2 (Resolved). Then `compute_payouts` is needed (same as normal resolution flow). If tie, dispute.status reverts to 0.
   - What's unclear: Should the UI automatically chain `compute_payouts` after `finalize_dispute` succeeds (similar to open_dispute -> init_dispute_tally chaining)? Or should it wait for the user to manually trigger "Reveal Payouts" via the existing `RevealPayoutsMode`?
   - Recommendation: Let the state machine handle it naturally. After `finalize_dispute`, the websocket updates the market state. If market transitions to state=2 (Resolved), `getBetPanelMode` will return `'reveal-payouts'` which shows the existing `RevealPayoutsMode` with the "Reveal Payouts" button. No auto-chaining needed -- the user takes a second action. This keeps the UX consistent with the non-dispute resolution flow.

## Sources

### Primary (HIGH confidence)
- `programs/avenir/src/instructions/open_dispute.rs` -- OpenDispute account struct, handler logic, remaining_accounts pattern
- `programs/avenir/src/instructions/mpc/init_dispute_tally.rs` -- InitDisputeTally account struct, ArgBuilder pattern (no user input)
- `programs/avenir/src/instructions/mpc/finalize_dispute.rs` -- FinalizeDispute account struct, MPC lock pattern, ArgBuilder with account-only
- `programs/avenir/src/instructions/add_tiebreaker.rs` -- AddTiebreaker account struct, remaining_accounts[0] pattern
- `programs/avenir/src/lib.rs:417-479` -- finalize_dispute_callback handler (tie detection, state transitions)
- `app/src/hooks/useCastVote.ts` -- Reference pattern for dispute PDA derivation and Arcium accounts
- `app/src/hooks/usePlaceBet.ts` -- Reference pattern for multi-step progress and exponential backoff
- `app/src/hooks/useComputePayouts.ts` -- Reference pattern for permissionless MPC queue instruction
- `app/src/hooks/useDisputeData.ts` -- Websocket subscription pattern for real-time dispute updates
- `app/src/components/market/BetPlacement.tsx` -- getBetPanelMode state machine, DisputeEscalateMode, DisputeFinalizedMode shells
- `app/src/lib/pda.ts` -- All dispute PDA helpers already exist
- `target/idl/avenir.json` -- Full IDL with all dispute instructions present

### Secondary (MEDIUM confidence)
- `app/src/lib/idl/avenir.json` vs `target/idl/avenir.json` diff -- confirmed app IDL is stale (missing 16+ instructions including all dispute ops)

### Tertiary (LOW confidence)
- add_tiebreaker remaining_accounts resolution -- slot-dependent determinism makes frontend prediction unreliable; retry-based approach recommended but unverified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- all patterns established in existing hooks, this is mechanical wiring
- Pitfalls: HIGH -- identified from direct code reading of on-chain and frontend sources
- add_tiebreaker slot determinism: MEDIUM -- theoretical concern, may not be an issue in practice if TX processes quickly

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- no external library changes expected)
