---
phase: 12-pool-init-encryption-hardening
verified: 2026-03-07T05:36:00Z
status: passed
score: 11/11 must-haves verified
re_verification: true
re_verification_reason: "Gap-closure audit found stale claims: encryption truths (7-11) referenced old encryption.ts with split cipher.encrypt calls and nonce+1 derivation. Phase 13 moved encryption client-side to client-encryption.ts with a single combined cipher.encrypt([isYes, amount], nonce) call, eliminating the CTR counter-reuse bug. Phase 12 verification re-verified with current line numbers and cross-references."
---

# Phase 12: Pool Init & Encryption Hardening -- Re-Verification Report

**Phase Goal:** Ensure new markets have MPC-initialized pools before first bet and fix nonce reuse in client-side encryption
**Verified:** 2026-03-07T05:36:00Z
**Status:** PASSED
**Re-verification:** Yes -- original verification referenced stale encryption module path (`encryption.ts`) and split-call nonce pattern. Phase 13 replaced this with `client-encryption.ts` using a single combined `cipher.encrypt([isYes, amount], nonce)` call. This re-verification confirms current codebase state.

---

## Goal Achievement

### Observable Truths

Plan 01 must-haves (BET-01, BET-02):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | create_market + init_pool are auto-chained as two sequential TXs in a single user action | VERIFIED | `useCreateMarket.ts` runs `program.methods.createMarket(...)` at line 105-123 then `program.methods.initPool(computationOffset)` at line 189-197 in the same `mutationFn`, gated by `marketCreated` state flag at line 79 |
| 2 | init_pool retries up to 3 times on failure before showing error | VERIFIED | `MAX_INIT_RETRIES = 3` constant at line 45; retry loop at lines 176-209 with exponential backoff (2s, 4s, 8s via `BASE_DELAY_MS * Math.pow(2, attempt - 1)` at line 184) |
| 3 | Hook resolves after init_pool TX is confirmed (fire-and-forget, does NOT wait for MPC callback) | VERIFIED | `connection.confirmTransaction(initSig, 'confirmed')` at line 201, then `setStep('success')` at line 203 -- no await on MPC callback |
| 4 | Bet panel shows spinner when MarketPool ciphertext is all zeros | VERIFIED | `PoolInitializingMode` at lines 193-303 renders a `div.animate-spin` spinner (line 266) with text "The encrypted pool is being initialized via MPC" at lines 268-269 |
| 5 | Bet panel auto-refreshes via WebSocket when pool state changes to initialized | VERIFIED | `useMarketPool` WebSocket subscription at line 50 of useMarketPool.ts: `connection.onAccountChange(poolPda, () => { queryClient.invalidateQueries({ queryKey: ['marketPool', marketId] }) })`. BetPlacement re-evaluates `poolReady` from live query at lines 134-136 |
| 6 | Recovery button appears after ~30s timeout for permissionless init_pool retry | VERIFIED | `{elapsed >= 30 && ...}` at line 273 of BetPlacement.tsx renders `<Button>Initialize Pool</Button>` (lines 284-291) with full Arcium account derivation in `handleRecovery` (lines 208-255) |

Plan 02 must-haves (BET-02, INF-07):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Each cipher.encrypt call in the bet path uses a unique nonce per ciphertext field | VERIFIED | **Fixed by Phase 13** -- `client-encryption.ts` line 127-130: `cipher.encrypt([BigInt(isYes ? 1 : 0), BigInt(amountLamports)], nonce)` -- a single combined call that produces two ciphertext fields under distinct CTR counter blocks from the same nonce. This replaces the old split-call pattern in `encryption.ts` that had a CTR counter-reuse vulnerability. |
| 8 | The encryption approach ensures no nonce reuse between ciphertext fields | VERIFIED | **Fixed by Phase 13** -- The combined `cipher.encrypt([field1, field2], nonce)` call in `client-encryption.ts` at line 127-130 internally increments the CTR counter for each field element, making the old nonce+1 derivation unnecessary. Single nonce, two distinct counter blocks. |
| 9 | useCastVote is confirmed safe (single field, no nonce reuse possible) | VERIFIED | `client-encryption.ts` lines 87-90: single `cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce)` call -- only one field encrypted, structurally impossible to reuse. `useCastVote.ts` line 20 imports `encryptVoteForMpcClient` from `#/lib/client-encryption`. |
| 10 | All encrypt callsites across the frontend have been audited | VERIFIED | All encryption now goes through `client-encryption.ts` which exports exactly two functions: `encryptBetForMpcClient` (lines 110-141) and `encryptVoteForMpcClient` (lines 73-100). `usePlaceBet.ts` line 21 imports `encryptBetForMpcClient`. `useCastVote.ts` imports `encryptVoteForMpcClient`. Old `app/src/server/arcium-encryption.ts` replaced with throw-on-import guard. No other encrypt callsites exist. |
| 11 | The return type includes nonce data for downstream ArgBuilder usage | VERIFIED | `EncryptedBetResult` interface at lines 50-56 of `client-encryption.ts` includes `nonce: number[]` and `nonceBN: string`. `usePlaceBet.ts` passes `new BN(encrypted.nonceBN)` to `placeBet` at line 135. |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/hooks/useCreateMarket.ts` | Multi-TX hook chaining create_market + init_pool with partial-success recovery | VERIFIED | 273 lines; exports `CreateMarketStep` type and `useCreateMarket` function; `marketCreated` flag at line 67 skips create_market on retry |
| `app/src/hooks/useMarketPool.ts` | MarketPool data hook with WebSocket subscription for pool init detection | VERIFIED | 67 lines; exports `useMarketPool` and `isPoolInitialized`; `useReadOnlyProgram` used (line 34) so it works without wallet |
| `app/src/components/market/BetPlacement.tsx` | Pool-initializing gate mode in getBetPanelMode state machine | VERIFIED | `pool-initializing` added as first entry in `PanelMode` union (13 modes total, line 46); `getBetPanelMode` checks it as first condition at line 70 |
| `app/src/lib/client-encryption.ts` | Client-side encryption module with nonce-safe combined encrypt call | VERIFIED | 142 lines. **Phase 13 replacement** for old `encryption.ts`. Single `cipher.encrypt([isYes, amount], nonce)` call at line 127-130 eliminates CTR counter-reuse. Exports `encryptBetForMpcClient` and `encryptVoteForMpcClient`. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useCreateMarket.ts` | init_pool on-chain instruction | Arcium account derivation + queue_computation | WIRED | `program.methods.initPool(computationOffset)` at line 189-190; all Arcium accounts derived via helper imports (lines 9-20) and constructed at lines 154-174 |
| `useMarketPool.ts` | MarketPool PDA | WebSocket subscription + TanStack Query invalidation | WIRED | `connection.onAccountChange(poolPda, ...)` at line 50; `queryClient.invalidateQueries({ queryKey: ['marketPool', marketId] })` at line 51 |
| `BetPlacement.tsx` | `useMarketPool.ts` | isPoolInitialized check in getBetPanelMode | WIRED | `import { useMarketPool, isPoolInitialized }` at line 18; `poolQuery = useMarketPool(market.id)` at line 131; `poolReady` computed at lines 134-136 and passed as 5th arg to `getBetPanelMode` at line 137 |
| `client-encryption.ts` | `usePlaceBet.ts` | encryptBetForMpcClient import, nonceBN passed to placeBet instruction | WIRED | `import { encryptBetForMpcClient }` at line 21 of usePlaceBet.ts; `encrypted = await encryptBetForMpcClient(...)` at line 76; `new BN(encrypted.nonceBN)` passed to `placeBet` at line 135. **Fixed by Phase 13** -- import path changed from `encryption.ts` to `client-encryption.ts`, encryption now happens entirely in browser |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BET-01 | 12-01-PLAN | User can place a Yes or No bet on a binary market with USDC (minimum $1) | SATISFIED | Pool-initializing gate (BetPlacement line 70) prevents bets on uninitialized markets, ensuring `update_pool` MPC succeeds. BetPlacement returns to `bet` mode once pool is initialized via WebSocket detection. |
| BET-02 | 12-01-PLAN, 12-02-PLAN | User's bet amount is encrypted via Arcium MPC and added to the encrypted pool | SATISFIED | (1) init_pool now auto-chains after create_market ensuring pool is ready (useCreateMarket lines 140-213); (2) **Fixed by Phase 13**: nonce reuse vulnerability closed by combined `cipher.encrypt([isYes, amount], nonce)` call in `client-encryption.ts` (line 127-130), eliminating CTR counter-reuse from the old split-call approach |
| INF-07 | 12-02-PLAN | Client-side encryption via @arcium-hq/client (x25519 key exchange, RescueCipher) | SATISFIED | **Fixed by Phase 13**: `client-encryption.ts` uses `@arcium-hq/client` directly in the browser via dynamic import at line 27-29. `prepareEncryptionContext` (lines 23-46) performs x25519 key exchange and RescueCipher setup. Vite config aliases Node crypto to crypto-browserify for browser compatibility. All encryption happens in the browser -- no plaintext crosses browser/server boundary. |

No orphaned requirements found -- all three IDs (BET-01, BET-02, INF-07) are claimed by plans and verified in code.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

No TODOs, FIXMEs, placeholder returns, or stub implementations detected in any of the modified files. The server encryption guard module (`app/src/server/arcium-encryption.ts`) intentionally throws on import -- this is a protective guard against regression, not an incomplete implementation.

---

### Human Verification Required

The following items require human or integration testing because they involve real on-chain Arcium MPC interaction:

#### 1. Pool Initialization Round-Trip

**Test:** Create a new market via `useCreateMarket`, wait for both TXs to confirm, then observe the MarketPool PDA account on-chain.
**Expected:** After init_pool TX confirms, the MPC callback eventually writes non-zero bytes into `yesPoolEncrypted` and `noPoolEncrypted`. The BetPlacement gate then automatically lifts (within WebSocket update latency).
**Why human:** Requires live devnet connection with functional Arcium MXE accounts. DKG is currently blocked on devnet (0/142 MXE accounts), so this cannot be tested programmatically at the moment.

#### 2. Recovery Button Flow

**Test:** Load a market with uninitialized pool (all-zero ciphertext), wait 30 seconds, click "Initialize Pool" recovery button.
**Expected:** Recovery init_pool TX is submitted; if successful, WebSocket detects the account change and BetPlacement transitions from `pool-initializing` to `bet` mode automatically.
**Why human:** Requires real wallet connection and on-chain state manipulation.

#### 3. Combined Encrypt Produces Correct Ciphertext

**Test:** Call `encryptBetForMpcClient` and inspect returned `isYesCiphertext` and `amountCiphertext` arrays.
**Expected:** Both are 32-byte arrays produced by a single `cipher.encrypt([isYes, amount], nonce)` call. MPC decryption should successfully recover both plaintext fields.
**Why human:** Runtime verification of cryptographic output -- actual MPC decryption of both fields should be tested when devnet DKG is operational.

---

### Gap-Closure Phase Verification Status

All three gap-closure phases have passing verification docs:

| Phase | Verification Status | Score | Verified Date |
|-------|-------------------|-------|---------------|
| Phase 13: Restore Client-Side Encryption Boundary | PASSED | 4/4 | 2026-03-06T03:15:00Z |
| Phase 14: Repair Dispute Escalation Account Ordering | PASSED | 7/7 | 2026-03-06T14:50:00Z |
| Phase 15: Wire Market Creation Into Live UI Flow | PASSED | 10/10 | 2026-03-06T12:15:00Z |

All three gap-closure phases were verified by gsd-verifier with full observable truths, required artifacts, key link verification, and requirements coverage tables.

---

## Gaps Summary

**Original Phase 12 verification was stale:** The initial verification (2026-03-04) referenced `encryption.ts` with a split `cipher.encrypt()` call pattern and deterministic nonce+1 derivation for the second field. This was the Phase 12 fix for nonce reuse, but it was subsequently superseded by Phase 13.

**Fixed by Phase 13:** Phase 13 (Restore Client-Side Encryption Boundary) replaced the server-side encryption path entirely. The new `client-encryption.ts` module uses a single combined `cipher.encrypt([isYes, amount], nonce)` call (line 127-130) that produces distinct CTR counter blocks internally, making the nonce+1 derivation unnecessary. The old `encryption.ts` is no longer the active encryption path -- `usePlaceBet.ts` now imports from `client-encryption.ts` (line 21).

**Re-verification confirms:** All 11 observable truths are verified against the current codebase with correct line numbers. Truths 7-11 now reference `client-encryption.ts` instead of the old `encryption.ts`. All four key links are wired with current import paths. All three requirement IDs (BET-01, BET-02, INF-07) are satisfied with Phase 13 cross-references in their evidence.

**Cross-reference:** See `13-VERIFICATION.md` for Phase 13's own verification of the client-side encryption fix (4/4 truths, all passing).

---

_Re-verified: 2026-03-07T05:36:00Z_
_Original verification: 2026-03-04T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
