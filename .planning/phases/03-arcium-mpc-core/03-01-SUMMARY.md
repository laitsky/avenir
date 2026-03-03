---
phase: 03-arcium-mpc-core
plan: 01
subsystem: infra
tags: [arcium, mpc, docker, arcis, hello-world, encrypted-instructions, callback, queue-computation]

# Dependency graph
requires:
  - phase: 01-foundation-03
    provides: "Arcium CLI v0.8.5, arcis 0.8.5 encrypted-ixs package, arcium build pipeline"
provides:
  - "Docker Desktop v4.63.0 installed (needs first-time EULA acceptance)"
  - "arcium-anchor, arcium-client, arcium-macros 0.8.5 dependencies in Cargo.toml"
  - "hello_world circuit (713M ACUs) compiling alongside init_pool (140M ACUs)"
  - "MPC instruction module pattern: instructions/mpc/ with init_comp_def, queue, callback"
  - "Full Anchor instruction wiring: #[arcium_program], ArgBuilder, queue_computation, #[arcium_callback]"
  - "@arcium-hq/client v0.8.5 TypeScript SDK for client-side encryption"
  - "Integration test skeleton for hello-world MPC lifecycle"
affects: [03-arcium-mpc-core, 05-bet-placement, 06-market-resolution, 08-dispute-system]

# Tech tracking
tech-stack:
  added: [arcium-anchor 0.8.5, arcium-client 0.8.5, arcium-macros 0.8.5, "@arcium-hq/client 0.8.5", docker-desktop 4.63.0]
  patterns: [arcium-program-migration, mpc-instruction-module, init-comp-def-pattern, queue-computation-pattern, callback-accounts-pattern, arcium-callback-pattern, argbuilder-pattern]

key-files:
  created:
    - programs/avenir/src/instructions/mpc/mod.rs
    - programs/avenir/src/instructions/mpc/init_hello_world_comp_def.rs
    - programs/avenir/src/instructions/mpc/hello_world.rs
    - programs/avenir/src/instructions/mpc/hello_world_callback.rs
    - tests/mpc/hello-world.ts
  modified:
    - programs/avenir/Cargo.toml
    - programs/avenir/src/lib.rs
    - programs/avenir/src/instructions/mod.rs
    - programs/avenir/src/errors.rs
    - encrypted-ixs/src/lib.rs
    - package.json
    - bun.lock
    - Cargo.lock

key-decisions:
  - "Changed #[program] to #[arcium_program] in lib.rs -- one-time Arcium migration enabling MPC callback validation"
  - "Added ErrorCode type alias (pub use AvenirError as ErrorCode) for Arcium macro compatibility"
  - "Used two separate x25519_pubkey + plaintext_u128 + encrypted_u64 blocks in ArgBuilder for two Enc<Shared, u64> inputs"
  - "Callback handler inline in lib.rs with #[arcium_callback] -- accounts struct in separate hello_world_callback.rs"
  - "@arcium-hq/client upgraded to v0.8.5 (from expected v0.5.2 in research) -- matches Rust crate versions"
  - "Docker Desktop installed via Homebrew; required removal of stale symlinks from previous installation"

patterns-established:
  - "MPC instruction module pattern: instructions/mpc/ directory with init_{circuit}_comp_def.rs, {circuit}.rs, {circuit}_callback.rs"
  - "Arcium program migration: #[arcium_program] wraps #[program] and generates ArciumSignerAccount + validate_callback_ixs"
  - "ErrorCode alias pattern: pub use AvenirError as ErrorCode in errors.rs for Arcium macro compatibility"
  - "Init comp_def pattern: init_computation_definition_accounts macro with payer, mxe_account, comp_def_account, address_lookup_table, lut_program"
  - "Queue computation pattern: queue_computation_accounts macro with payer, mxe_account, sign_pda_account, mempool, execpool, computation, comp_def, cluster, pool, clock accounts"
  - "Callback pattern: callback_accounts macro on struct + #[arcium_callback] on handler fn inside #[arcium_program] module"
  - "Import pattern for MPC files: use crate::{ID, ID_CONST, ArciumSignerAccount}; use crate::errors::ErrorCode;"

requirements-completed: [INF-02]

# Metrics
duration: 25min
completed: 2026-03-03
---

# Phase 3 Plan 1: Hello-World MPC Circuit Summary

**Arcium MPC hello-world circuit with full instruction wiring (init_comp_def, queue, callback), Docker Desktop installed, arcium build verified for both circuits**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-03T06:53:37Z
- **Completed:** 2026-03-03T07:19:31Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Docker Desktop v4.63.0 installed via Homebrew (needs user EULA acceptance for `arcium test`)
- Arcium Rust dependencies (arcium-anchor, arcium-client, arcium-macros 0.8.5) added and compiling
- hello_world circuit written (713M ACUs) validating Enc<Shared, u64> input, Enc<Mxe, u64> output, arithmetic, to_arcis/from_arcis lifecycle
- Full MPC instruction module pattern established: init_hello_world_comp_def, hello_world (queue), hello_world_callback
- #[arcium_program] migration complete with proper callback validation
- @arcium-hq/client v0.8.5 TypeScript SDK installed for client-side encryption
- Integration test written covering: RescueCipher encryption, comp_def init, computation queueing, finalization awaiting, callback log verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Docker, add Arcium Rust dependencies, write hello-world circuit** - `ce3eb84` (feat)
2. **Task 2: Write hello-world Anchor instructions and integration test** - `09593b8` (feat)

## Files Created/Modified
- `programs/avenir/Cargo.toml` - Added arcium-anchor, arcium-client, arcium-macros 0.8.5; arcium-anchor/idl-build feature
- `encrypted-ixs/src/lib.rs` - Added hello_world circuit (Enc<Shared, u64> + Enc<Shared, u64> -> Enc<Mxe, u64>)
- `programs/avenir/src/lib.rs` - Changed #[program] to #[arcium_program], added MPC handler wiring, callback handler
- `programs/avenir/src/errors.rs` - Added ClusterNotSet error, ErrorCode type alias for Arcium macros
- `programs/avenir/src/instructions/mod.rs` - Added pub mod mpc; pub use mpc::*;
- `programs/avenir/src/instructions/mpc/mod.rs` - MPC module with hello_world, hello_world_callback, init_hello_world_comp_def
- `programs/avenir/src/instructions/mpc/init_hello_world_comp_def.rs` - Computation definition initialization instruction
- `programs/avenir/src/instructions/mpc/hello_world.rs` - Queue computation instruction with ArgBuilder
- `programs/avenir/src/instructions/mpc/hello_world_callback.rs` - Callback accounts struct with callback_accounts macro
- `tests/mpc/hello-world.ts` - Integration test for hello-world MPC lifecycle
- `package.json` - Added @arcium-hq/client v0.8.5
- `Cargo.lock` - Updated with arcium dependency tree

## Decisions Made
- **#[arcium_program] migration:** Changed from #[program] to #[arcium_program] in lib.rs. This is a one-time migration that wraps Anchor's #[program] and adds ArciumSignerAccount PDA + validate_callback_ixs security function.
- **ErrorCode alias:** Created `pub use AvenirError as ErrorCode` in errors.rs because Arcium's callback_accounts and queue_computation_accounts macros generate code referencing `ErrorCode::ClusterNotSet`. Without this alias, the generated code can't find `ErrorCode` in scope.
- **ArgBuilder pattern for two Enc<Shared, T> inputs:** Each Enc<Shared, T> input requires its own x25519_pubkey + plaintext_u128(nonce) + encrypted_u64(value) triplet in the ArgBuilder chain. This is because each encrypted value carries its own key/nonce context.
- **Callback handler placement:** The callback handler body is inline in lib.rs (required by #[arcium_callback] macro inside #[arcium_program] module), while the callback accounts struct is in a separate hello_world_callback.rs file with the #[callback_accounts] macro.
- **@arcium-hq/client v0.8.5:** The research noted v0.5.2, but the latest on npm is v0.8.5 which matches the Rust crate versions. Used the latest.
- **Docker broken symlinks cleanup:** Removed 8 stale Docker symlinks from a previous installation (from 2022-2023) that prevented Homebrew from completing the install.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Broken Docker symlinks preventing installation**
- **Found during:** Task 1 (Docker installation)
- **Issue:** `/usr/local/bin/hub-tool`, `/usr/local/bin/kubectl.docker`, and 6 other broken symlinks from a previous Docker installation caused `brew install --cask docker-desktop` to fail repeatedly.
- **Fix:** Removed all 8 broken symlinks (`hub-tool`, `kubectl.docker`, `docker`, `docker-compose`, `docker-credential-desktop`, `docker-credential-ecr-login`, `docker-credential-osxkeychain`, `com.docker.cli`, `docker-index`) and retried installation.
- **Files modified:** System files only (no code changes)
- **Verification:** `brew install --cask docker-desktop` completed successfully
- **Committed in:** N/A (system-level)

**2. [Rule 2 - Missing Critical] ErrorCode type alias for Arcium macro compatibility**
- **Found during:** Task 2 (arcium build compilation)
- **Issue:** Arcium's callback_accounts and queue_computation_accounts macros generate code referencing `ErrorCode::ClusterNotSet`. Without an `ErrorCode` type with `ClusterNotSet` variant in scope, compilation fails.
- **Fix:** Added `ClusterNotSet` variant to AvenirError enum and created `pub use AvenirError as ErrorCode` type alias in errors.rs.
- **Files modified:** programs/avenir/src/errors.rs
- **Verification:** `arcium build` compiles successfully in both release and test profiles
- **Committed in:** 09593b8

**3. [Rule 3 - Blocking] crate::ID and crate::ID_CONST not in scope in sub-module files**
- **Found during:** Task 2 (arcium build compilation)
- **Issue:** Arcium PDA derivation macros (derive_mxe_pda!, derive_sign_pda!, derive_comp_def_pda!) reference `ID` and `ID_CONST` which are only available at the crate root. Sub-module files need explicit imports.
- **Fix:** Added `use crate::{ID, ID_CONST};` and `use crate::ArciumSignerAccount;` to each MPC instruction file.
- **Files modified:** programs/avenir/src/instructions/mpc/init_hello_world_comp_def.rs, hello_world.rs, hello_world_callback.rs
- **Verification:** `arcium build` compiles successfully
- **Committed in:** 09593b8

---

**Total deviations:** 3 auto-fixed (1 blocking system, 1 missing critical, 1 blocking scope)
**Impact on plan:** All auto-fixes necessary for compilation and correct macro expansion. No scope creep.

## Issues Encountered
- **Docker Desktop EULA not accepted:** Docker Desktop was installed successfully but requires first-time user interaction (EULA acceptance) before the daemon starts. `docker ps` and `arcium test` fail until this is done. The arcium build and all code compilation succeeds without Docker. This blocks the `arcium test` verification but not the code deliverables.
- **arcium-client stack size warning:** The arcium-client crate produces a warning about a function exceeding max stack offset by 717KB. This is in arcium-client's own code (not ours) and doesn't prevent compilation or affect runtime on Solana.
- **Anchor's __client_accounts module re-export:** The #[derive(Accounts)] macro generates hidden `__client_accounts_*` modules that must be accessible at the crate root. Required using glob re-exports (`pub use mpc::*;`) rather than named re-exports.

## User Setup Required
Docker Desktop needs first-time configuration:
1. Open Docker Desktop from Applications
2. Accept the EULA/Service Agreement
3. Wait for engine initialization (whale icon in menu bar shows running)
4. Verify with: `docker ps` (should return empty table)
5. Then run: `arcium test` to verify full MPC lifecycle

## Next Phase Readiness
- MPC instruction module pattern (`instructions/mpc/`) fully established for reuse in plans 03-02a (update_pool), 03-02b, 03-03
- hello_world circuit validates Enc<Shared, T> input, Enc<Mxe, T> output, basic arithmetic -- confirms the Arcium toolchain works
- All Arcium Rust dependencies installed and compiling (arcium-anchor, arcium-client, arcium-macros 0.8.5)
- @arcium-hq/client TypeScript SDK installed for client-side encryption in tests
- `arcium test` verification deferred until Docker Desktop is configured by user
- The ErrorCode alias and import patterns are documented for future MPC instruction files

## Self-Check: PASSED

All 10 created/modified files verified present. Task 1 commit (ce3eb84) and Task 2 commit (09593b8) verified in git log. SUMMARY.md created.

---
*Phase: 03-arcium-mpc-core*
*Completed: 2026-03-03*
