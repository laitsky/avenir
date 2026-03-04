---
phase: 12-pool-init-encryption-hardening
plan: 02
subsystem: encryption
tags: [arcium, nonce, stream-cipher, x25519, rescue-cipher, mpc]

# Dependency graph
requires:
  - phase: 03-arcium-mpc-core
    provides: "RescueCipher encryption pattern, encryptBetForMPC function"
  - phase: 07-core-ui-integration
    provides: "encryptBetForMPC integration in usePlaceBet hook"
provides:
  - "Fixed encryptBetForMPC with unique nonce per ciphertext field"
  - "Backward-compatible return type with nonce2/nonce2BN for future ArgBuilder usage"
affects: [usePlaceBet, place_bet ArgBuilder]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Deterministic nonce derivation via little-endian u128 increment"]

key-files:
  created: []
  modified: ["app/src/lib/encryption.ts"]

key-decisions:
  - "Deterministic nonce+1 derivation over random second nonce for reproducibility and ArgBuilder compatibility"
  - "Backward-compatible return type: nonce/nonceBN retained, nonce2/nonce2BN added"
  - "On-chain ArgBuilder change deferred: single plaintext_u128(nonce) kept, may need update if MPC decryption fails"

patterns-established:
  - "Nonce derivation: sequential little-endian u128 increment for multi-field encryption"

requirements-completed: [BET-02, INF-07]

# Metrics
duration: 1min
completed: 2026-03-04
---

# Phase 12 Plan 02: Encryption Nonce Fix Summary

**Fixed nonce reuse vulnerability in encryptBetForMPC with deterministic nonce+1 derivation per ciphertext field**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-04T16:20:40Z
- **Completed:** 2026-03-04T16:21:59Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Fixed critical nonce reuse vulnerability where both isYes and amount used the same nonce in cipher.encrypt
- Implemented deterministic nonce derivation (nonce1+1 as little-endian u128) for second ciphertext field
- Audited all frontend encrypt callsites: useCastVote.ts confirmed safe (single field), JurorVotePanel delegates to useCastVote, no other callsites found
- Return type backward-compatible with nonce2/nonce2BN added for future on-chain ArgBuilder changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix nonce reuse in encryptBetForMPC and audit all encrypt callsites** - `c17959f` (fix)

## Files Created/Modified
- `app/src/lib/encryption.ts` - Fixed dual nonce derivation, updated JSDoc, added ArgBuilder consideration comment

## Decisions Made
- Used deterministic nonce+1 derivation (not random second nonce) for reproducibility and potential ArgBuilder sequential auto-derivation
- Kept on-chain ArgBuilder unchanged (single plaintext_u128 nonce) per research recommendation -- deferred to if MPC decryption fails
- Return type is backward-compatible: existing nonce/nonceBN fields preserved, nonce2/nonce2BN added alongside

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Encryption nonce vulnerability closed (INT-05)
- usePlaceBet.ts has access to both nonces via return type if on-chain ArgBuilder needs dual-nonce update
- Remaining phase 12 plan (12-01) covers pool initialization hardening

## Self-Check: PASSED

- [x] `app/src/lib/encryption.ts` exists
- [x] Commit `c17959f` exists in git log

---
*Phase: 12-pool-init-encryption-hardening*
*Completed: 2026-03-04*
