---
phase: 12-pool-init-encryption-hardening
verified: 2026-03-04T17:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 12: Pool Init & Encryption Hardening Verification Report

**Phase Goal:** Ensure new markets have MPC-initialized pools before first bet and fix nonce reuse in client-side encryption
**Verified:** 2026-03-04T17:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Plan 01 must-haves (BET-01, BET-02):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | create_market + init_pool are auto-chained as two sequential TXs in a single user action | VERIFIED | `useCreateMarket.ts` runs `program.methods.createMarket(...)` then `program.methods.initPool(computationOffset)` in the same `mutationFn`, gated by `marketCreated` state flag |
| 2 | init_pool retries up to 3 times on failure before showing error | VERIFIED | `MAX_INIT_RETRIES = 3` constant at line 33; retry loop at lines 176-207 with exponential backoff (2s, 4s, 8s) |
| 3 | Hook resolves after init_pool TX is confirmed (fire-and-forget, does NOT wait for MPC callback) | VERIFIED | `connection.confirmTransaction(initSig, 'confirmed')` at line 199, then `setStep('success')` — no await on MPC callback |
| 4 | Bet panel shows spinner when MarketPool ciphertext is all zeros | VERIFIED | `PoolInitializingMode` at line 181 renders a `div.animate-spin` spinner with text "The encrypted pool is being initialized via MPC" |
| 5 | Bet panel auto-refreshes via WebSocket when pool state changes to initialized | VERIFIED | `useMarketPool` WebSocket subscription (line 50 of useMarketPool.ts) calls `queryClient.invalidateQueries({ queryKey: ['marketPool', marketId] })` on account change; BetPlacement re-evaluates `poolReady` from live query |
| 6 | Recovery button appears after ~30s timeout for permissionless init_pool retry | VERIFIED | `{elapsed >= 30 && ...}` at line 280 of BetPlacement.tsx renders `<Button>Initialize Pool</Button>` with full Arcium account derivation in `handleRecovery` |

Plan 02 must-haves (BET-02, INF-07):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Each cipher.encrypt call in encryptBetForMPC uses a unique nonce (no nonce reuse) | VERIFIED | `cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce1)` at line 74; `cipher.encrypt([BigInt(amount)], nonce2)` at line 75 — two distinct nonce variables |
| 8 | The second nonce is deterministically derived from the first (nonce + 1 as little-endian u128) | VERIFIED | Lines 59-66 of encryption.ts: `nonce2.set(nonce1)` + carry-propagation loop incrementing as little-endian u128 |
| 9 | useCastVote is confirmed safe (single field, no nonce reuse possible) | VERIFIED | useCastVote.ts line 78: single `cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce)` call — only one field encrypted, structurally impossible to reuse |
| 10 | All other encrypt callsites across the frontend have been audited | VERIFIED | Grep across `app/src` finds only two files with `cipher.encrypt`: `encryption.ts` (fixed) and `useCastVote.ts` (safe, single field). No other callsites exist. |
| 11 | The return type includes both nonces for downstream ArgBuilder usage | VERIFIED | Return type at lines 22-30 includes `nonce: Uint8Array`, `nonceBN: bigint`, `nonce2: Uint8Array`, `nonce2BN: bigint` |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/hooks/useCreateMarket.ts` | Multi-TX hook chaining create_market + init_pool with partial-success recovery | VERIFIED | 274 lines; exports `CreateMarketStep` type and `useCreateMarket` function; `marketCreated` flag skips create_market on retry |
| `app/src/hooks/useMarketPool.ts` | MarketPool data hook with WebSocket subscription for pool init detection | VERIFIED | 67 lines; exports `useMarketPool` and `isPoolInitialized`; `useReadOnlyProgram` used so it works without wallet |
| `app/src/components/market/BetPlacement.tsx` | Pool-initializing gate mode in getBetPanelMode state machine | VERIFIED | `pool-initializing` added as first entry in `PanelMode` union (13 modes total); `getBetPanelMode` checks it as first condition at line 58 |
| `app/src/lib/encryption.ts` | Fixed encryptBetForMPC with unique nonce per ciphertext field | VERIFIED | Nonce reuse vulnerability closed; nonce1 for isYes, nonce2 (= nonce1+1) for amount; backward-compatible return type |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useCreateMarket.ts` | init_pool on-chain instruction | Arcium account derivation + queue_computation | WIRED | `program.methods.initPool(computationOffset)` at line 187; all 12 Arcium accounts derived via dynamic `@arcium-hq/client` import (lines 136-172) |
| `useMarketPool.ts` | MarketPool PDA | WebSocket subscription + TanStack Query invalidation | WIRED | `connection.onAccountChange(poolPda, ...)` at line 50; `queryClient.invalidateQueries({ queryKey: ['marketPool', marketId] })` at line 51 (note: plan pattern `onAccountChange.*marketPool` doesn't match literally because variable name is `poolPda`, but semantics are correct) |
| `BetPlacement.tsx` | `useMarketPool.ts` | isPoolInitialized check in getBetPanelMode | WIRED | `import { useMarketPool, isPoolInitialized }` at line 19; `poolQuery = useMarketPool(market.id)` at line 119; `poolReady` computed and passed as 5th arg to `getBetPanelMode` at line 125 |
| `encryption.ts` | `usePlaceBet.ts` | encryptBetForMPC import, nonceBN passed to placeBet instruction | WIRED | `import { encryptBetForMPC }` at line 13 of usePlaceBet.ts; `encrypted = await encryptBetForMPC(...)` at line 65; `new BN(encrypted.nonceBN.toString())` passed to `placeBet` at line 141 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BET-01 | 12-01-PLAN | User can place a Yes or No bet on a binary market with USDC (minimum $1) | SATISFIED | Pool-initializing gate prevents bets on uninitialized markets, ensuring `update_pool` MPC (which failed on zero ciphertext) now succeeds. BetPlacement returns to `bet` mode once pool is initialized. |
| BET-02 | 12-01-PLAN, 12-02-PLAN | User's bet amount is encrypted via Arcium MPC and added to the encrypted pool | SATISFIED | (1) init_pool now auto-chains after create_market ensuring pool is ready; (2) nonce reuse vulnerability closed — each field encrypted with unique nonce, preventing XOR-based plaintext leakage |
| INF-07 | 12-02-PLAN | Client-side encryption via @arcium-hq/client (x25519 key exchange, RescueCipher) | SATISFIED | `encryptBetForMPC` correctly uses x25519 ECDH + RescueCipher with unique per-field nonces; all other encrypt callsites audited and confirmed safe |

No orphaned requirements found — all three IDs (BET-01, BET-02, INF-07) are claimed by plans and verified in code.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

No TODOs, FIXMEs, placeholder returns, or stub implementations detected in any of the four modified files. The ArgBuilder deferral note in encryption.ts (lines 68-71) is a documented, intentional architectural decision — not an incomplete implementation.

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

#### 3. Nonce Uniqueness Under Encryption

**Test:** Call `encryptBetForMPC` and inspect returned `nonce` and `nonce2` byte arrays.
**Expected:** `nonce2` equals `nonce` with 1 added as little-endian u128. The two ciphertext arrays differ even for identical plaintext inputs.
**Why human:** Runtime verification of cryptographic output — the increment logic (lines 59-66) can be reviewed statically (it is correct), but actual MPC decryption of both fields should be tested when devnet DKG is operational.

---

### Gaps Summary

No gaps found. All 11 observable truths are verified in the codebase. All four artifacts exist, are substantive (274, 67, 1254, 103 lines respectively), and are wired into the application. All three requirement IDs are satisfied by implementation evidence.

One minor observation (not a gap): The key_link pattern specified for `useMarketPool` (`onAccountChange.*marketPool`) does not match the literal code because the WebSocket subscription uses `poolPda` as the variable name rather than `marketPool`. The semantics are fully correct — this is a pattern-naming discrepancy only.

---

_Verified: 2026-03-04T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
