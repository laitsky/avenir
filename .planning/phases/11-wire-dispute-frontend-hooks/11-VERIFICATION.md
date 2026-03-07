---
phase: 11-wire-dispute-frontend-hooks
verified: 2026-03-07T05:36:00Z
status: passed
score: 5/5 must-haves verified
re_verification: true
re_verification_reason: "Gap-closure audit found stale claims: useOpenDispute originally passed resolver PDAs in registry order but open_dispute validated against slot-shuffled jurors. Fixed by Phase 14 (predictable seed juror selection via shared juror-selection.ts module). Phase 11 verification re-verified with current line numbers and cross-references."
---

# Phase 11: Wire Dispute Frontend Hooks -- Re-Verification Report

**Phase Goal:** Complete the dispute E2E flows by adding missing frontend hooks that call on-chain dispute instructions
**Verified:** 2026-03-07T05:36:00Z
**Status:** PASSED
**Re-verification:** Yes -- original verification referenced stale juror selection pattern. Phase 14 replaced registry-order resolver passing with deterministic `selectJurors()` from shared `juror-selection.ts` module. This re-verification confirms current codebase state.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | useOpenDispute submits open_dispute TX with correct resolver remaining_accounts using deterministic juror selection | VERIFIED | `useOpenDispute.ts:29` imports `selectJurors` from `#/lib/juror-selection`. Line 115 calls `selectJurors(marketId, resolvers)` to compute exact 7-juror ordering. Lines 116-120 build `resolverAccounts` from selected jurors. Line 136 passes via `.remainingAccounts(resolverAccounts)`. **Fixed by Phase 14** -- useOpenDispute now uses `selectJurors()` for deterministic client-predictable juror ordering instead of registry order. |
| 2 | useFinalizeDispute submits finalize_dispute TX to queue MPC tally reveal | VERIFIED | `useFinalizeDispute.ts:75-85` calls `.finalizeDispute(computationOffset)` with full Arcium account set including `compDefAccount` at line 65-67 using `getComputationDefinitionAddress(PROGRAM_ID, "finalize_dispute")`. Mirrors `useComputePayouts` permissionless MPC queue pattern. |
| 3 | init_dispute_tally is auto-chained after successful open_dispute | VERIFIED | `useOpenDispute.ts:154-194` -- step 3 runs unconditionally after step 2 lands; `disputeOpened` flag at line 70 enables retry-only-init path if open_dispute succeeded but init failed |
| 4 | DisputeEscalateMode.handleEscalate calls useOpenDispute and escalation completes E2E | VERIFIED | `BetPlacement.tsx:823-829` -- `useOpenDispute(market.id)` destructured as `{ mutate: escalate, step, retryCount, resolverCount, reset }`. Line 836: `escalate()` call in `handleEscalate`. EscalateProgress component at lines 896-1009 shows 2-step progress. |
| 5 | DisputeFinalizedMode triggers via useFinalizeDispute and fog clears on tally reveal | VERIFIED | `BetPlacement.tsx:1194` -- `useFinalizeDispute(market.id)` called in `DisputeFinalizedMode`. Lines 1207-1215: `FogOverlay density="heavy"` wraps loading state during MPC reveal. Line 1220: "Reveal Outcome" button calls `finalizeDispute.mutate()`. |

**Score: 5/5 truths verified**

---

### Required Artifacts

#### Plan 11-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/lib/idl/avenir.json` | Regenerated IDL with all dispute instructions | VERIFIED | Contains `open_dispute`, `init_dispute_tally`, `finalize_dispute`, `add_tiebreaker`, `cast_vote` and all associated comp_def/callback instructions |
| `app/src/hooks/useOpenDispute.ts` | Hook to submit open_dispute + auto-chain init_dispute_tally | VERIFIED | 295 lines; exports `useOpenDispute`, `EscalateStep` type; full chaining logic with `disputeOpened` flag for partial-failure recovery. Now imports `selectJurors` from `juror-selection.ts` (Phase 14 fix) |
| `app/src/lib/juror-selection.ts` | Shared deterministic juror selection module | VERIFIED | 77 lines; exports `selectJurors` and `selectTiebreakerJuror`; uses LCG constant `6364136223846793005n` matching on-chain. **Created by Phase 14** to replace registry-order passing. |
| `app/src/components/market/BetPlacement.tsx` | DisputeEscalateMode wired to useOpenDispute with 2-step progress | VERIFIED | `EscalateProgress` component at lines 896-1009; step labels "Escalating..." and "Initializing vote tally..." match plan spec |

#### Plan 11-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/hooks/useFinalizeDispute.ts` | Hook to submit finalize_dispute MPC queue instruction | VERIFIED | 113 lines; exports `useFinalizeDispute`; uses `getComputationDefinitionAddress(PROGRAM_ID, 'finalize_dispute')` at line 65-67 |
| `app/src/hooks/useAddTiebreaker.ts` | Hook to submit add_tiebreaker instruction for tie scenarios | VERIFIED | 101 lines; exports `useAddTiebreaker`; imports `selectTiebreakerJuror` from `juror-selection.ts` (line 12, Phase 14 fix); fetches registry + dispute accounts, computes deterministic tiebreaker selection at lines 52-57, passes single resolver PDA as `remainingAccounts` at lines 73-79 |
| `app/src/components/market/BetPlacement.tsx` | DisputeFinalizedMode + DisputePendingMode with quorum/tie states | VERIFIED | All four `DisputePendingMode` states implemented: tie detected (lines 1047-1077), quorum reached (lines 1080-1119), voting expired (lines 1122-1148), active voting (lines 1150-1183). `DisputeFinalizedMode` at lines 1189-1227 has "Reveal Outcome" button. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BetPlacement.tsx` | `useOpenDispute.ts` | `DisputeEscalateMode` calls `escalate()` on button click | WIRED | Line 12 import; line 829 destructure; line 836 `escalate()` call in `handleEscalate` |
| `useOpenDispute.ts` | `app/src/lib/pda.ts` | Derives dispute, tally, registry, position PDAs | WIRED | Lines 21-28 import all six PDA helpers; all used in mutation at lines 109-112, 97 |
| `useOpenDispute.ts` | `juror-selection.ts` | Computes deterministic 7-juror ordering | WIRED | Line 29: `import { selectJurors }`. Line 115: `selectJurors(marketId, resolvers)`. **Fixed by Phase 14** -- replaced registry-order passing with predictable seed Fisher-Yates selection |
| `useOpenDispute.ts` | `@arcium-hq/client` | Derives Arcium accounts for `init_dispute_tally` MPC queue | WIRED | Arcium helper imports at lines 8-19; `getComputationDefinitionAddress(PROGRAM_ID, 'init_dispute_tally')` at line 175-178 |
| `BetPlacement.tsx` | `useFinalizeDispute.ts` | `DisputeFinalizedMode` and `DisputePendingMode` call `useFinalizeDispute` | WIRED | Line 16 import; line 1026 in `DisputePendingMode`; line 1194 in `DisputeFinalizedMode` |
| `BetPlacement.tsx` | `useAddTiebreaker.ts` | Auto-trigger on tie detection when dispute status resets to Voting | WIRED | Line 17 import; line 1027 in `DisputePendingMode`; `useEffect` at lines 1040-1044 auto-calls `addTiebreaker.mutate()` |
| `useAddTiebreaker.ts` | `juror-selection.ts` | Computes deterministic tiebreaker selection | WIRED | Line 12: `import { selectTiebreakerJuror }`. Lines 52-57: `selectTiebreakerJuror(marketId, voteCount, resolvers, currentJurors)`. **Fixed by Phase 14** -- replaced slot-dependent retry with deterministic seed-based selection |
| `useFinalizeDispute.ts` | `@arcium-hq/client` | Derives Arcium accounts for `finalize_dispute` MPC queue | WIRED | Arcium helper imports at lines 7-18; `getComputationDefinitionAddress(PROGRAM_ID, 'finalize_dispute')` at lines 65-67 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RES-03 | 11-01 | After grace period, any market participant can trigger dispute escalation | SATISFIED | `DisputeEscalateMode` routes to `useOpenDispute` when market is in escalation-eligible state; resolver pre-check at line 841-842 disables button if fewer than 7 resolvers. **Phase 14 fix ensures** `selectJurors()` computes the same ordering as on-chain, preventing account-contract mismatch that previously blocked escalation. |
| RES-05 | 11-02 | Resolver votes are encrypted via Arcium MPC (no juror sees other votes) | SATISFIED | `useFinalizeDispute` queues MPC reveal via `finalize_dispute` circuit; `init_dispute_tally` auto-chained from `useOpenDispute` to initialize encrypted vote state. **Phase 14 fix ensures** juror selection is deterministic so the dispute lifecycle completes end-to-end. |
| RES-06 | 11-02 | Dispute outcome is determined by stake-weighted encrypted vote tally | SATISFIED | `useFinalizeDispute` submits `finalize_dispute` computation to Arcium MPC which performs stake-weighted tally decryption. `useAddTiebreaker` now uses `selectTiebreakerJuror()` (Phase 14 fix) for deterministic tiebreaker selection without slot-dependent retry. |

All three requirement IDs claimed across both plans are accounted for. No orphaned requirement IDs found for Phase 11.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `BetPlacement.tsx` | 1044 | `useEffect` missing `addTiebreaker.mutate` in dependency array | Warning | Stale closure risk -- `mutate` is stable (TanStack Query guarantee) so this is safe in practice, but exhaustive-deps lint will flag it |

No stub patterns, no placeholder `return null` / empty implementations, no console-log-only handlers found in any of the modified/created files.

---

### Human Verification Required

The following behaviors require runtime verification against a live devnet cluster:

#### 1. Escalation E2E with Real Resolver Registry

**Test:** Connect a wallet that holds a `UserPosition` on a market in escalation-eligible state. Click "Escalate to Dispute". Observe the 2-step progress indicator.
**Expected:** Step 1 shows "Escalating...", step 2 shows "Initializing vote tally...", followed by success toast "Dispute escalated -- jury voting will begin shortly".
**Why human:** Requires live Solana devnet with seeded `ResolverRegistry` containing 7+ resolver accounts.

#### 2. Resolver Pre-check Disabled State

**Test:** Visit a market in escalation-eligible state when the `ResolverRegistry` has fewer than 7 active resolvers.
**Expected:** Escalate button is disabled and tooltip text "Not enough resolvers available (X/7 required)" appears below.
**Why human:** Requires controlled devnet state with sub-7 resolver count.

#### 3. finalize_dispute MPC Round-trip and Fog Clear

**Test:** When a dispute reaches quorum, click "Reveal Outcome". Observe fog intensification, then wait for MPC callback to land.
**Expected:** `FogOverlay density="heavy"` churns during processing. After websocket push updates `market.state`, the panel transitions away from `dispute-finalized` mode.
**Why human:** Requires live Arcium MPC network to process the `finalize_dispute` computation and fire the callback.

#### 4. Tie Detection Auto-tiebreaker

**Test:** Force a tie scenario (quorum reached, finalize_dispute_callback resets dispute to status=0 with `tiebreakerAdded=false`).
**Expected:** Panel shows "Tie detected -- selecting tiebreaker juror" and `useAddTiebreaker` fires automatically. After success, panel updates with extended jury and new voting window.
**Why human:** Tie scenario requires specific on-chain state that is difficult to reproduce without coordinated resolver voting.

---

## Gaps Summary

**Original Phase 11 verification was stale:** The initial verification (2026-03-04) referenced `useOpenDispute` passing resolver PDAs in registry order. This was a regression -- the on-chain `open_dispute` instruction validated resolvers against a slot-shuffled Fisher-Yates selection, causing account-contract mismatches that would fail at runtime.

**Fixed by Phase 14:** Phase 14 (Repair Dispute Escalation Account Ordering) replaced the slot-dependent juror selection with a client-predictable seed (`market.id`) and created the shared `juror-selection.ts` module. Both `useOpenDispute` and `useAddTiebreaker` now import from this module, ensuring the client computes the exact same juror ordering as on-chain before TX submission.

**Re-verification confirms:** All five observable truths are verified against the current codebase with correct line numbers. All eight key links are wired (increased from six -- two new links for juror-selection.ts). All three requirement IDs (RES-03, RES-05, RES-06) are satisfied with Phase 14 cross-references in their evidence.

**Cross-reference:** See `14-VERIFICATION.md` for Phase 14's own verification of the juror selection fix (7/7 truths, all passing).

---

_Re-verified: 2026-03-07T05:36:00Z_
_Original verification: 2026-03-04T23:05:00Z_
_Verifier: Claude (gsd-verifier)_
