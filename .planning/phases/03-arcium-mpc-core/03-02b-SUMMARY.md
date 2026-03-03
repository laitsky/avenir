---
phase: 03-arcium-mpc-core
plan: 02b
subsystem: infra
tags: [arcium, mpc, anchor, init-pool, update-pool, callback, argbuilder, market-pool, mpc-lock, encrypted-state-relay]

# Dependency graph
requires:
  - phase: 03-arcium-mpc-core-01
    provides: "MPC instruction module pattern (instructions/mpc/), #[arcium_program], ArgBuilder, callback wiring"
  - phase: 03-arcium-mpc-core-02a
    provides: "MarketPool PDA with fixed-layout encrypted fields, Market struct with mpc_lock/sentiment"
provides:
  - "init_pool MPC instruction set (comp_def, queue, callback) for initializing encrypted pool zeros"
  - "update_pool MPC instruction set (comp_def, queue with ArgBuilder.account(), callback with state writeback)"
  - "update_pool circuit with BetInput struct and multiplication-based sentiment bucket logic"
  - "create_market initializes MarketPool PDA alongside Market and vault"
  - "MpcLocked error for concurrent bet protection via mpc_lock"
  - "Complete encrypted state relay: create_market -> init_pool -> update_pool -> callback writeback"
affects: [05-bet-placement, 06-market-resolution, 03-arcium-mpc-core]

# Tech tracking
tech-stack:
  added: []
  patterns: [init-pool-queue-pattern, update-pool-argbuilder-pattern, tuple-output-callback-destructuring, callback-account-writable-pattern, mpc-lock-pattern, market-pool-pda-init-in-create-market]

key-files:
  created:
    - programs/avenir/src/instructions/mpc/init_pool_comp_def.rs
    - programs/avenir/src/instructions/mpc/init_pool.rs
    - programs/avenir/src/instructions/mpc/init_pool_callback.rs
    - programs/avenir/src/instructions/mpc/init_update_pool_comp_def.rs
    - programs/avenir/src/instructions/mpc/update_pool.rs
    - programs/avenir/src/instructions/mpc/update_pool_callback.rs
  modified:
    - programs/avenir/src/instructions/mpc/mod.rs
    - programs/avenir/src/lib.rs
    - programs/avenir/src/instructions/create_market.rs
    - programs/avenir/src/errors.rs
    - encrypted-ixs/src/lib.rs

key-decisions:
  - "update_pool callback destructures tuple output as UpdatePoolOutput { field_0: { field_0: MXEEncryptedStruct<2>, field_1: u8 } } -- Arcium generates nested structs for tuple returns"
  - "CallbackAccount imported from arcium_client::idl::arcium::types (not in arcium_anchor prelude) for specifying writable callback accounts"
  - "update_pool_callback releases mpc_lock on both success AND failure to prevent permanent market lockout"
  - "MarketPool PDA initialized with zero-bytes in create_market -- init_pool MPC must be called separately to write valid MXE-encrypted zeros"
  - "ArgBuilder.account() offset 16 (8 discriminator + 8 market_id) reads 64 bytes (2 x 32-byte ciphertexts) from MarketPool"

patterns-established:
  - "Tuple output callback pattern: for circuits returning (Enc<Mxe, T>, u8), access via result.field_0.ciphertexts and result.field_1"
  - "Writable callback accounts: use CallbackAccount { pubkey, is_writable: true } in callback_ix() for accounts the callback needs to mutate"
  - "MPC lock pattern: check mpc_lock before queue, set it, release in callback (even on failure)"
  - "MarketPool PDA lifecycle: create_market inits empty -> init_pool writes encrypted zeros -> update_pool reads/writes ciphertext"
  - "Import pattern for CallbackAccount: use arcium_client::idl::arcium::types::CallbackAccount"

requirements-completed: [INF-02, INF-03]

# Metrics
duration: 11min
completed: 2026-03-03
---

# Phase 3 Plan 2b: Pool MPC Instructions Summary

**Complete init_pool and update_pool Anchor instruction sets with ArgBuilder encrypted state relay, MarketPool PDA creation in create_market, and mpc_lock concurrent bet protection**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-03T07:23:32Z
- **Completed:** 2026-03-03T07:34:12Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full init_pool instruction set: comp_def initializer, queue (no args -- just initializes encrypted zeros), callback writes MXE-encrypted PoolTotals to MarketPool
- Full update_pool instruction set: comp_def initializer, queue with ArgBuilder (encrypted bet input + on-chain pool ciphertext read), callback with tuple output destructuring writing ciphertexts/nonce/sentiment/total_bets back
- update_pool circuit with BetInput struct, multiplication-based sentiment bucket logic (3 comparisons: 1 bool branch + 2 sentiment thresholds), and .reveal() for plaintext sentiment output
- create_market now initializes MarketPool PDA alongside Market and vault token account
- mpc_lock prevents concurrent update_pool calls; released in callback on both success and failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Write init_pool Anchor instructions (comp_def, queue, callback)** - `50d07e8` (feat)
2. **Task 2: Write update_pool Anchor instructions, update create_market, add error variant** - `56dd478` (feat)

## Files Created/Modified
- `programs/avenir/src/instructions/mpc/init_pool_comp_def.rs` - Computation definition initialization for init_pool circuit
- `programs/avenir/src/instructions/mpc/init_pool.rs` - Queue init_pool MPC computation (no user args, just initializes encrypted zeros)
- `programs/avenir/src/instructions/mpc/init_pool_callback.rs` - Callback accounts struct for init_pool (MarketPool as writable)
- `programs/avenir/src/instructions/mpc/init_update_pool_comp_def.rs` - Computation definition initialization for update_pool circuit
- `programs/avenir/src/instructions/mpc/update_pool.rs` - Queue update_pool with ArgBuilder (encrypted bet + on-chain pool ciphertext at offset 16)
- `programs/avenir/src/instructions/mpc/update_pool_callback.rs` - Callback accounts struct for update_pool (MarketPool + Market as writable)
- `programs/avenir/src/instructions/mpc/mod.rs` - Added init_pool and update_pool module exports
- `programs/avenir/src/lib.rs` - Wired 6 new handlers (3 init_pool + 3 update_pool) with #[arcium_callback] macros
- `programs/avenir/src/instructions/create_market.rs` - Added MarketPool PDA init alongside Market
- `programs/avenir/src/errors.rs` - Added MpcLocked error variant
- `encrypted-ixs/src/lib.rs` - Added update_pool circuit with BetInput struct and sentiment logic

## Decisions Made
- **Tuple output destructuring:** The update_pool circuit returns `(Enc<Mxe, PoolTotals>, u8)`. Arcium generates `UpdatePoolOutput { field_0: Struct { field_0: MXEEncryptedStruct<2>, field_1: u8 } }`. Access pattern: `result.field_0.ciphertexts[0..1]` for pool, `result.field_1` for sentiment. This was determined by reading arcium-macros gen_callback_types.rs documentation.
- **CallbackAccount import path:** `CallbackAccount` is NOT in `arcium_anchor::prelude::*`. It must be imported from `arcium_client::idl::arcium::types::CallbackAccount`. This is needed for specifying writable accounts in callback instructions.
- **mpc_lock failure recovery:** The update_pool_callback releases `mpc_lock` on BOTH success and failure paths. Without this, a failed MPC computation would permanently lock the market. This is a Rule 2 auto-fix (missing critical functionality).
- **MarketPool PDA in create_market:** MarketPool is initialized with zero-filled arrays in create_market, NOT with valid MXE-encrypted data. The init_pool MPC instruction must be called separately after market creation to generate proper MXE-encrypted zeros. This two-step process is required because account creation (rent-paying) must happen in a user transaction, but MPC computation is asynchronous.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] update_pool circuit not yet written (03-02a dependency incomplete)**
- **Found during:** Task 1 (pre-execution dependency check)
- **Issue:** Plan 03-02b depends on 03-02a which creates the update_pool circuit. 03-02a Task 2 (circuit writing) was not completed, so the circuit did not exist.
- **Fix:** Wrote the update_pool circuit with BetInput struct and multiplication-based sentiment logic as part of Task 1, following the 03-02a plan specification exactly.
- **Files modified:** encrypted-ixs/src/lib.rs
- **Verification:** `arcium build` compiles all 3 circuits (init_pool, hello_world, update_pool)
- **Committed in:** 50d07e8

**2. [Rule 2 - Missing Critical] mpc_lock release on callback failure path**
- **Found during:** Task 2 (update_pool_callback implementation)
- **Issue:** Plan specified mpc_lock release only on success. If MPC computation fails (AbortedComputation), the market would be permanently locked.
- **Fix:** Added `ctx.accounts.market.mpc_lock = false;` in the error/failure branch of update_pool_callback before returning the error.
- **Files modified:** programs/avenir/src/lib.rs
- **Verification:** Both success and failure paths release mpc_lock
- **Committed in:** 56dd478

---

**Total deviations:** 2 auto-fixed (1 blocking dependency, 1 missing critical)
**Impact on plan:** Both necessary for correct execution. The circuit dependency was a prerequisite gap; the mpc_lock fix prevents a permanent lockout scenario.

## Issues Encountered
- **Linter reverting mod.rs:** The system linter repeatedly reverted mpc/mod.rs and lib.rs changes when new module files were being created. Resolved by ensuring all files were written before modifying mod.rs, and using Write tool for the final lib.rs to prevent partial state.
- **arcium-client stack size warning:** Pre-existing warning about function exceeding max stack offset by 717KB in arcium-client crate. This is in Arcium's own code, not ours. Does not affect compilation or runtime.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete instruction set for encrypted state relay: create_market -> init_pool -> update_pool -> callback
- Ready for plan 03-03 (state relay POC integration test) to validate the full lifecycle
- The update_pool queue instruction is the integration point for Phase 5 (bet placement)
- ArgBuilder byte offset (16) is deterministic for all markets since MarketPool has fixed-layout fields
- Sentiment bucket logic (1=LeaningYes, 2=Even, 3=LeaningNo) ready for frontend display in Phase 7

## Self-Check: PASSED

All 6 created files verified present. Task 1 commit (50d07e8) and Task 2 commit (56dd478) verified in git log. SUMMARY.md created.

---
*Phase: 03-arcium-mpc-core*
*Completed: 2026-03-03*
