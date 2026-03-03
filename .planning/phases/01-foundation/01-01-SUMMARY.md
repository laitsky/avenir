---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [anchor, solana, rust, arcium, pda, usdc-vault, spl-token]

# Dependency graph
requires:
  - phase: none
    provides: "First plan in project, no prior dependencies"
provides:
  - "Anchor 0.32.1 Solana program scaffold with compiling build"
  - "Config PDA account struct with admin, fee_recipient, usdc_mint, protocol_fee_bps, market_counter, paused, bump"
  - "Market PDA account struct with 200-char question, encrypted pools, sentiment, vault_bump"
  - "UserPosition PDA account struct with composite [market_id, user] seeds"
  - "Initialize instruction creating Config singleton PDA"
  - "Arcium project structure with encrypted-ixs/ placeholder"
  - "Integration test proving Config PDA creation on localnet"
affects: [02-market-creation, 03-arcium-mpc, 05-encrypted-betting, 06-resolution]

# Tech tracking
tech-stack:
  added: [anchor-lang 0.32.1, anchor-spl 0.32.1, spl-token 7.0, solana-cli 3.0.15, rust 1.93.0]
  patterns: [PDA-with-InitSpace, Config-singleton-PDA, PDA-owned-vault-pattern, composite-PDA-seeds]

key-files:
  created:
    - programs/avenir/src/lib.rs
    - programs/avenir/src/state/config.rs
    - programs/avenir/src/state/market.rs
    - programs/avenir/src/state/user_position.rs
    - programs/avenir/src/instructions/initialize.rs
    - programs/avenir/src/errors.rs
    - tests/avenir.ts
    - Arcium.toml
    - Anchor.toml
  modified: []

key-decisions:
  - "Upgraded Rust from 1.89.0 to 1.93.0 to support Cargo features needed by transitive deps"
  - "Pinned blake3 to 1.6.1 to avoid constant_time_eq edition2024 incompatibility with Solana platform-tools"
  - "Used Solana CLI 3.0.15 (latest stable) instead of 2.3.0 for newer platform-tools"
  - "Used anchor init + manual Arcium structure instead of arcium init (Docker not installed)"

patterns-established:
  - "PDA account model: #[account] + #[derive(InitSpace)] + space = 8 + T::INIT_SPACE"
  - "Config singleton PDA: seeds = [b'config'], one-time init by admin"
  - "Market PDA: seeds = [b'market', market_id.to_le_bytes()]"
  - "UserPosition PDA: seeds = [b'position', market_id.to_le_bytes(), user.key()]"
  - "USDC vault pattern: vault_bump stored in Market, token::authority = market PDA"
  - "Error handling: #[error_code] enum with descriptive messages"

requirements-completed: [INF-01, MKT-04]

# Metrics
duration: 14min
completed: 2026-03-03
---

# Phase 1 Plan 1: Solana Program Scaffold Summary

**Anchor 0.32.1 Solana program with Config/Market/UserPosition PDA account model, initialize instruction, and USDC vault pattern**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-03T00:16:48Z
- **Completed:** 2026-03-03T00:31:12Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments
- Anchor 0.32.1 project compiles and deploys to localnet with full account model
- Config PDA initialized via `initialize` instruction with admin, fee_recipient, usdc_mint, protocol_fee_bps fields
- Market account struct defines encrypted pool fields (2x [u8;32] ciphertext), sentiment bucket, and vault_bump for USDC vault custody
- UserPosition PDA with composite seeds [market_id, user_pubkey] ready for bet tracking
- Integration test passes 2/2: Config creation and duplicate rejection

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Arcium project and configure Solana/Anchor toolchain** - `009b511` (feat)
2. **Task 2: Define account model (Config, Market, UserPosition) and USDC vault pattern** - `9621f41` (feat)
3. **Task 3: Implement initialize instruction and integration test** - `239363a` (feat)

## Files Created/Modified
- `Anchor.toml` - Anchor configuration for localnet with anchor_version 0.32.1
- `Arcium.toml` - Arcium project configuration pointing to programs/ and encrypted-ixs/
- `Cargo.toml` - Rust workspace with optimized release profile
- `rust-toolchain.toml` - Pins Rust 1.93.0 with rustfmt and clippy
- `programs/avenir/Cargo.toml` - Program dependencies: anchor-lang, anchor-spl, spl-token
- `programs/avenir/src/lib.rs` - Program entry point with declare_id! and initialize handler
- `programs/avenir/src/state/config.rs` - Config account struct (admin, fees, USDC mint, paused)
- `programs/avenir/src/state/market.rs` - Market account struct (question, encrypted pools, sentiment, vault_bump)
- `programs/avenir/src/state/user_position.rs` - UserPosition account struct (market_id, user, amounts, claimed)
- `programs/avenir/src/state/mod.rs` - State module re-exports
- `programs/avenir/src/instructions/initialize.rs` - Initialize instruction with Config PDA creation
- `programs/avenir/src/instructions/mod.rs` - Instructions module re-exports
- `programs/avenir/src/errors.rs` - AvenirError enum with 5 error variants
- `tests/avenir.ts` - Integration test: Config creation + duplicate rejection
- `encrypted-ixs/src/lib.rs` - Placeholder for Phase 3 Arcium MPC circuits

## Decisions Made
- Upgraded Rust from 1.89.0 to 1.93.0: The `constant_time_eq` v0.4.2 crate (transitive dep via blake3 via solana-program) requires Cargo edition2024 support. Solana's bundled platform-tools Cargo 1.84.0 does not support this, so we also pinned blake3 to v1.6.1 which uses constant_time_eq 0.3.1.
- Used Solana CLI 3.0.15 (latest stable) instead of the plan's 2.3.0: Required for newer platform-tools, though the underlying Cargo version issue was still resolved via blake3 pinning.
- Used `anchor init` + manual Arcium structure: `arcium init` requires Docker which is not installed. Created Arcium.toml and encrypted-ixs/ manually per the plan's fallback approach.
- Test script uses `bun run ts-mocha` instead of `bun run tests/`: Anchor's test runner expects a proper test framework command, not a directory path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] constant_time_eq edition2024 incompatibility**
- **Found during:** Task 1 (Anchor build)
- **Issue:** `constant_time_eq v0.4.2` requires Cargo `edition2024` feature, which is not supported by Solana's bundled platform-tools Cargo 1.84.0
- **Fix:** Pinned blake3 to v1.6.1 in Cargo.lock (which uses constant_time_eq 0.3.1) via `cargo update blake3@1.8.3 --precise 1.6.1`
- **Files modified:** Cargo.lock
- **Verification:** `anchor build` compiles successfully
- **Committed in:** 009b511

**2. [Rule 3 - Blocking] Rust version upgrade from 1.89.0 to 1.93.0**
- **Found during:** Task 1 (Anchor build)
- **Issue:** Rust 1.89.0 was initially specified but its bundled Cargo also could not handle the dependency. Upgraded for broader compatibility.
- **Fix:** Changed rust-toolchain.toml channel from 1.89.0 to 1.93.0
- **Files modified:** rust-toolchain.toml
- **Verification:** `anchor build` compiles successfully
- **Committed in:** 009b511

**3. [Rule 3 - Blocking] arcium init requires Docker (not installed)**
- **Found during:** Task 1 (project initialization)
- **Issue:** `arcium init` requires Docker, Yarn, and Solana in PATH. Docker is not installed on this machine.
- **Fix:** Used `anchor init avenir --no-git` + manually created Arcium.toml and encrypted-ixs/ directory per the plan's fallback approach
- **Files modified:** Arcium.toml, encrypted-ixs/src/lib.rs
- **Verification:** Arcium.toml exists, encrypted-ixs/ structure present
- **Committed in:** 009b511

**4. [Rule 1 - Bug] anchor-spl idl-build feature missing**
- **Found during:** Task 2 (Anchor build warning)
- **Issue:** Anchor warned that `anchor-spl/idl-build` feature was not enabled, risking cryptic compile errors
- **Fix:** Added `"anchor-spl/idl-build"` to the `idl-build` feature list in programs/avenir/Cargo.toml
- **Files modified:** programs/avenir/Cargo.toml
- **Verification:** Warning resolved on subsequent builds
- **Committed in:** 9621f41

**5. [Rule 1 - Bug] Test script path incorrect**
- **Found during:** Task 3 (anchor test)
- **Issue:** `bun run tests/` as test script produced "Script not found" error. Anchor expects a runnable test command.
- **Fix:** Changed to `bun run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"`
- **Files modified:** Anchor.toml
- **Verification:** `anchor test` passes 2/2 tests
- **Committed in:** 239363a

---

**Total deviations:** 5 auto-fixed (3 blocking, 2 bug)
**Impact on plan:** All auto-fixes necessary for the build to compile and tests to run. No scope creep.

## Issues Encountered
- Solana platform-tools ships an older Cargo (1.84.0) even in the latest version (v1.51), which creates compatibility issues with newer crate editions. This is a known ecosystem limitation that requires careful dependency version management.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Program compiles with full account model ready for Phase 2 (Market Creation)
- Account structs with encrypted pool fields ready for Phase 3 (Arcium MPC)
- USDC vault pattern (vault_bump in Market, token::authority = market PDA) defined but not yet used until Phase 2's create_market instruction
- Note: Docker installation needed before Phase 3 for arcium test (MPC node testing)

## Self-Check: PASSED

All 10 created files verified present. All 3 task commits verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-03*
