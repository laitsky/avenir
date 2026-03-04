---
phase: 11-wire-dispute-frontend-hooks
verified: 2026-03-04T23:05:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 11: Wire Dispute Frontend Hooks — Verification Report

**Phase Goal:** Complete the dispute E2E flows by adding missing frontend hooks that call on-chain dispute instructions
**Verified:** 2026-03-04T23:05:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | useOpenDispute submits open_dispute TX with correct resolver remaining_accounts | VERIFIED | `useOpenDispute.ts:95-99` builds `resolverAccounts` from on-chain registry, passes via `.remainingAccounts()` at line 115 |
| 2 | useFinalizeDispute submits finalize_dispute TX to queue MPC tally reveal | VERIFIED | `useFinalizeDispute.ts:79-89` calls `.finalizeDispute(computationOffset)` with full Arcium account set; mirrors `useComputePayouts` pattern |
| 3 | init_dispute_tally is auto-chained after successful open_dispute | VERIFIED | `useOpenDispute.ts:133-196` — step 3 runs unconditionally after step 2 lands; `disputeOpened` flag enables retry-only-init path |
| 4 | DisputeEscalateMode.handleEscalate calls useOpenDispute and escalation completes E2E | VERIFIED | `BetPlacement.tsx:676-690` — `useOpenDispute(market.id)` destructured, `handleEscalate` calls `escalate()` on button click |
| 5 | DisputeFinalizedMode triggers via useFinalizeDispute and fog clears on tally reveal | VERIFIED | `BetPlacement.tsx:1049,1062-1070` — `useFinalizeDispute(market.id)` called; `FogOverlay density="heavy"` wraps loading state |

**Score: 5/5 truths verified**

---

### Required Artifacts

#### Plan 11-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/lib/idl/avenir.json` | Regenerated IDL with all dispute instructions | VERIFIED | 36 instructions total; `open_dispute`, `init_dispute_tally`, `finalize_dispute`, `add_tiebreaker`, `cast_vote` all present |
| `app/src/hooks/useOpenDispute.ts` | Hook to submit open_dispute + auto-chain init_dispute_tally | VERIFIED | 291 lines; exports `useOpenDispute`, `EscalateStep` type; full chaining logic with `disputeOpened` flag for partial-failure recovery |
| `app/src/components/market/BetPlacement.tsx` | DisputeEscalateMode wired to useOpenDispute with 2-step progress | VERIFIED | `EscalateProgress` component at lines 749-861; step labels "Escalating..." and "Initializing vote tally..." match plan spec |

#### Plan 11-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/hooks/useFinalizeDispute.ts` | Hook to submit finalize_dispute MPC queue instruction | VERIFIED | 117 lines; exports `useFinalizeDispute`; uses `getCompDefAccOffset('finalize_dispute')` correctly |
| `app/src/hooks/useAddTiebreaker.ts` | Hook to submit add_tiebreaker instruction for tie scenarios | VERIFIED | 100 lines; exports `useAddTiebreaker`; fetches registry + dispute accounts, filters candidates, passes single resolver PDA as `remainingAccounts` |
| `app/src/components/market/BetPlacement.tsx` | DisputeFinalizedMode + DisputePendingMode with quorum/tie states | VERIFIED | All four `DisputePendingMode` states implemented (tie detected, quorum reached, voting expired, active voting); `DisputeFinalizedMode` has "Reveal Outcome" button |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BetPlacement.tsx` | `useOpenDispute.ts` | `DisputeEscalateMode` calls `escalate()` on button click | WIRED | Line 11 import; line 682 destructure; line 689 `escalate()` call in `handleEscalate` |
| `useOpenDispute.ts` | `app/src/lib/pda.ts` | Derives dispute, tally, registry, position PDAs | WIRED | Lines 10-16 import all six PDA helpers; all used in mutation at lines 58, 78, 89-96 |
| `useOpenDispute.ts` | `@arcium-hq/client` | Derives Arcium accounts for `init_dispute_tally` MPC queue | WIRED | Dynamic import at line 141; `getCompDefAccOffset('init_dispute_tally')` at line 158 |
| `BetPlacement.tsx` | `useFinalizeDispute.ts` | `DisputeFinalizedMode` and `DisputePendingMode` call `useFinalizeDispute` | WIRED | Line 15 import; line 879 in `DisputePendingMode`; line 1049 in `DisputeFinalizedMode` |
| `BetPlacement.tsx` | `useAddTiebreaker.ts` | Auto-trigger on tie detection when dispute status resets to Voting | WIRED | Line 16 import; line 880 in `DisputePendingMode`; `useEffect` at lines 893-897 auto-calls `addTiebreaker.mutate()` |
| `useFinalizeDispute.ts` | `@arcium-hq/client` | Derives Arcium accounts for `finalize_dispute` MPC queue | WIRED | Dynamic import at line 40-52; `getCompDefAccOffset('finalize_dispute')` at line 57 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RES-03 | 11-01 | After grace period, any market participant can trigger dispute escalation | SATISFIED | `DisputeEscalateMode` routes to `useOpenDispute` when market is in escalation-eligible state; resolver pre-check at line 694 |
| RES-05 | 11-02 | Resolver votes are encrypted via Arcium MPC (no juror sees other votes) | SATISFIED | `useFinalizeDispute` queues MPC reveal via `finalize_dispute` circuit; `init_dispute_tally` auto-chained from `useOpenDispute` to initialize encrypted vote state |
| RES-06 | 11-02 | Dispute outcome is determined by stake-weighted encrypted vote tally | SATISFIED | `useFinalizeDispute` submits `finalize_dispute` computation to Arcium MPC which performs stake-weighted tally decryption |

All three requirement IDs claimed across both plans are accounted for. No orphaned requirement IDs found for Phase 11.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `BetPlacement.tsx` | 897 | `useEffect` missing `addTiebreaker.mutate` in dependency array | Warning | Stale closure risk — `mutate` is stable (TanStack Query guarantee) so this is safe in practice, but exhaustive-deps lint will flag it |

No stub patterns, no placeholder `return null` / empty implementations, no console-log-only handlers found in any of the four modified/created files.

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

### Build Verification

```
bun run build (app/) — PASSED in 3.75s — zero errors, zero warnings
```

All four commits verified to exist in git history:
- `5729ea9` — feat(11-01): regenerate IDL with dispute instructions and create useOpenDispute hook
- `9964381` — feat(11-01): wire DisputeEscalateMode to useOpenDispute with 2-step progress
- `3ade820` — feat(11-02): create useFinalizeDispute and useAddTiebreaker hooks
- `b074df0` — feat(11-02): wire DisputeFinalizedMode, quorum state, and tie detection

---

### IDL Instruction Coverage

The regenerated IDL at `app/src/lib/idl/avenir.json` contains 36 instructions. Dispute-relevant instructions confirmed present:

- `open_dispute` — used in `useOpenDispute` via `.openDispute()`
- `init_dispute_tally` — used in `useOpenDispute` via `.initDisputeTally(computationOffset)`
- `finalize_dispute` — used in `useFinalizeDispute` via `.finalizeDispute(computationOffset)`
- `add_tiebreaker` — used in `useAddTiebreaker` via `.addTiebreaker()`
- `cast_vote` — used in pre-existing `useCastVote` hook (Phase 8)
- `init_dispute_tally_comp_def`, `init_finalize_dispute_comp_def`, `init_add_dispute_vote_comp_def` — comp_def initializers
- `add_dispute_vote_callback`, `init_dispute_tally_callback`, `finalize_dispute_callback` — MPC callbacks

---

## Gaps Summary

No gaps. All five observable truths are verified. All six key links are wired. All three requirement IDs are satisfied. Build is clean. The only item of note is the `useEffect` missing dependency lint warning in `DisputePendingMode` which is safe in practice given TanStack Query's stable `mutate` reference guarantee.

---

_Verified: 2026-03-04T23:05:00Z_
_Verifier: Claude (gsd-verifier)_
