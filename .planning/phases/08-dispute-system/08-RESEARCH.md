# Phase 8: Dispute System - Research

**Researched:** 2026-03-04  
**Domain:** Solana (Anchor) + Arcium MPC dispute resolution + stake-weighted encrypted voting  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### Dispute timeline & eligibility
- Disputes are only for **unresolved** markets after the grace period (no “contested creator resolution” flow in v1).
- Grace period is **48 hours after market deadline** (`resolution_time`).
- After grace expiry, **late creator resolution is rejected**; the market must resolve via the dispute flow.
- Dispute escalation is triggerable by **any market participant** (wallet that holds a `UserPosition` on the market).
- No dispute bond is required for escalation in v1.

### Resolver pool staking & membership
- Resolver pool is **admin-approved** (not fully permissionless in v1).
- Intended flow: resolver **self-registers + stakes**, then admin approves them as active.
- Minimum stake to be eligible: **500 USDC**.
- Stake top-ups are allowed (resolvers can increase stake later).
- Withdrawals are allowed with constraints:
  - **7-day cooldown**
  - **disallowed while in an active dispute**
  - **partial withdrawals allowed** as long as remaining stake stays ≥ minimum.

### Jury voting & incentives
- Use a **fixed-size jury selected per dispute**.
- Jury size: **7 jurors**.
- Voting window length: **48 hours**.
- Vote weighting: **linear stake-weighted** (weight = resolver stake).
- Quorum: require at least **5 of 7** votes cast before finalizing.
- Tie handling: **extend voting** and **add 1 tiebreaker juror** (e.g., +24h + one additional juror selected).
- Incentives/slashing:
  - Minority jurors: **1% slash**
  - Non-voters: **0.5% penalty**
  - Slashed/penalty funds are **paid to majority voters**.

### Dispute UI experience
- Surfaces:
  - Show dispute status on **market cards** (badge) and **market detail** (prominent banner/panel).
- Grace-period warning:
  - During the 48h grace period, show a **grace countdown** (detail banner + small card badge): “Waiting for creator — dispute eligible in X”.
- Active dispute (non-jurors):
  - Show **status + timers + vote count only** (e.g., “3/7 votes submitted”), no leaning signal.
  - Show a simple **stepper + counts** (Escalated → Voting → Finalized).
- Active dispute (jurors):
  - Show a **prominent “You’re selected as juror” banner** and a dedicated **voting panel** (in the bet panel area).
  - Voting is **one-time** (no changes).
  - After voting: show **“Vote submitted”** + show the juror’s own choice; keep others hidden.
- Dispute finalization reveal:
  - Fog-clear reveal moment shows **outcome + short explanation** (not per-juror reward/slash breakdown in v1).

### Claude's Discretion
- Exact definitions for “active dispute” across edge cases (e.g., quorum extension, tiebreaker selection timing).
- Exact copy/text for banners, badges, and stepper labels.
- Cooldown enforcement UX (how withdrawals show pending/cooldown state).
- Whether vote-count displays include “selected” vs “submitted” (e.g., 7 selected, 3 submitted).

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Contested creator resolution (challenge window / appeal flow) — out of v1 scope for Phase 8 given “unresolved-only” dispute policy.
- Global alerts/notifications when a market enters dispute — consider Phase 9/v2.
- Per-juror reward/slash breakdown UI — keep v1 focused on the outcome reveal.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RES-02 | Resolution has a 48-hour grace period after market deadline | Update `resolve_market` time checks; expose grace logic to frontend banners; add tests/validation strategy acknowledging time-warp constraints. |
| RES-03 | After grace period, any market participant can trigger dispute escalation | Add `open_dispute`/`escalate_dispute` instruction that verifies `UserPosition` PDA and grace expiry; transition `Market.state` to `Disputed`. |
| RES-04 | Dedicated resolver pool members can stake USDC to become eligible jurors | Add resolver staking accounts + vaults, admin-approval flow, min stake, cooldown withdrawals, “active dispute” lockout. |
| RES-05 | Resolver votes are encrypted via Arcium MPC (no juror sees other votes) | Add dispute vote circuit + queue/callback wiring (mirrors `update_pool`), plus frontend encrypt-and-submit pattern (mirrors `encryptBetForMPC`). |
| RES-06 | Dispute outcome is determined by stake-weighted encrypted vote tally | Add encrypted tally account + MPC finalize circuit to reveal outcome and set `Market.winning_outcome`; handle ties via extension + tiebreak juror. |
</phase_requirements>

## Summary

Phase 8 is primarily an **on-chain state machine + staking subsystem** that feeds an **Arcium MPC accumulation circuit** (encrypted vote tally) and a finalization circuit (reveal outcome). The existing codebase already demonstrates the full pattern needed: (1) fixed-layout ciphertext accounts (`MarketPool`), (2) sequential MPC locking (`Market.mpc_lock`), (3) `queue_computation` + callback handlers implemented in `programs/avenir/src/lib.rs`, and (4) frontend client-side encryption via `@arcium-hq/client` with a “fog” UI metaphor.

The “gotchas” that matter for planning are less about UI and more about: **juror selection constraints on Solana (no account iteration), safe concurrency for multiple juror votes, account layout/offset correctness, and whether incentives (minority slashing) implicitly require post-finalization vote transparency** on a public chain. Also, the strict 48h windows are hard to test without either (a) configurable durations or (b) a time-warp strategy.

**Primary recommendation:** Model disputes as a **separate fixed-layout DisputeTally ciphertext account** (like `MarketPool`) plus a **Dispute metadata account** (jurors, timers, vote-count) and implement three MPC circuits: `init_dispute_tally`, `add_dispute_vote`, `finalize_dispute` using the existing queue/callback patterns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard (in this repo) |
|---------|---------|---------|------------------------------|
| `anchor-lang` | `0.32.1` | Solana program framework | Already used across all instructions and tests (`programs/avenir/Cargo.toml`). |
| `anchor-spl` | `0.32.1` | SPL Token CPI helpers | Already used for vault and payout transfers; reuse for staking/slashing. |
| `arcium-anchor` | `0.8.5` | MPC queue + callback macros | Existing MPC flow is built on it (`queue_computation_accounts`, `arcium_callback`). |
| `arcium-client` (Rust) | `0.8.5` | Arcium IDL types (CallbackAccount) | Used for callback account vectors in MPC instructions. |
| `arcis` | `0.8.5` | Circuit definitions (`#[encrypted]`, `Enc<Shared/Mxe, T>`) | Used in `encrypted-ixs` circuits, will host dispute circuits. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@coral-xyz/anchor` | `0.32.1` | TS client + tests | Needed for new dispute instructions and PDA derivations. |
| `@arcium-hq/client` | app uses `0.5.2`; root uses `^0.8.5` | Client-side encryption + awaiting MPC finalization | Dispute vote encryption should mirror bet encryption; version mismatch is a planning risk. |
| `@solana/spl-token` | `^0.4.14` | Token helpers in TS tests | Reuse for staking/slashing integration tests. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| On-chain pseudo-random juror selection | Off-chain selection + on-chain verification | Off-chain is simpler but weakens trust guarantees unless you add a verifiable randomness source. |
| One account for dispute metadata + ciphertext | Separate `Dispute` + `DisputeTally` | Single account reduces PDAs but increases offset/serialization fragility; separate fixed-layout account reduces MPC arg offset risk. |

## Architecture Patterns

### Recommended On-Chain Model

**Market lifecycle (existing + dispute):**
- `Market.state = Open (0)` until creator resolves (within grace) **or** dispute opens (after grace).
- On dispute open: `Market.state = Disputed (3)` and a `Dispute` PDA is created/initialized.
- On dispute finalize: set `Market.winning_outcome` + `Market.state = Resolved (2)` so the existing `compute_payouts` MPC + `claim_payout` pipeline continues unchanged.

**New accounts (recommended):**
- `Resolver` (or `ResolverStake`) PDA per resolver wallet: approval state, staked amount, withdrawal cooldown metadata, and an `active_disputes` counter/flag.
- `resolver_vault` SPL token account per resolver to custody staked USDC (authority = `Resolver` PDA).
- `ResolverRegistry` PDA: bounded list of active resolvers (needed because Solana programs can’t “discover” accounts).
- `Dispute` PDA per market: juror pubkeys, vote-count, window timestamps, status enum, quorum/tie state.
- `DisputeTally` PDA per market (fixed-layout): encrypted yes/no stake-weighted totals + nonce (MPC read/write target).

### MPC Pattern to Mirror (existing)

Use the same pattern as `update_pool` and `compute_payouts`:
- “queue” instruction builds `ArgBuilder` with:
  - `x25519_pubkey` + `nonce` + encrypted vote ciphertext(s) (juror input)
  - `.account()` slice reading ciphertext fields from a fixed-layout PDA
- callback in `programs/avenir/src/lib.rs`:
  - `verify_output(...)`
  - on success: write ciphertext back, update plaintext metadata (vote count, state), clear locks
  - on failure: clear locks, do not advance dispute state

### Juror Selection (Solana Constraint)

Solana programs **cannot iterate all resolver accounts**. Planning must choose one:

1) **Registry-driven selection (recommended):** keep a bounded `ResolverRegistry` list; require dispute-open tx to supply matching resolver PDAs; program selects jurors deterministically from the registry (pseudo-random seed based on clock/slot + market id).
2) **Caller-provided juror list (simplest):** dispute-open tx provides 7 resolvers; program validates “approved + min stake + unique”. This is easier but allows the disputer to bias selection.

## Don't Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MPC queue/callback plumbing | Custom CPI + bespoke callback verification | Existing `queue_computation_*` + `#[arcium_callback]` patterns | The repo already has correct account wiring and output verification patterns. |
| Ciphertext storage in variable-size accounts | Storing ciphertext inside `Market` | Dedicated fixed-layout accounts (`MarketPool` pattern) | MPC `.account()` reads require stable byte offsets. |
| Argument order/typing for circuits | “Looks right” ArgBuilder sequences | `arcium_macros::check_args` + `#[args("circuit")]` | Compile-time catching of arg mismatch once new `.idarc` is generated. |

## Common Pitfalls

### 1) Incentives vs privacy are in tension (minority slashing)
**What goes wrong:** To slash minority voters, the program must know (directly or indirectly) who voted against the outcome. On a public chain, that generally means the vote (or a majority/minority classification) becomes publicly inferable at finalization time.  
**How to avoid surprises:** Decide up front whether “votes are private forever” is a requirement. If yes, minority slashing cannot be done straightforwardly on-chain. If “private until reveal” is acceptable, proceed and keep UI minimal even if chain data is observable.

### 2) Concurrent vote submissions can corrupt the tally
**What goes wrong:** Two jurors vote “at the same time”, both MPC jobs read the same tally ciphertext and race to write back, losing one update.  
**How to avoid:** Reuse `Market.mpc_lock` (or add a `Dispute.mpc_lock`) to serialize vote MPC jobs per market/dispute.

### 3) Byte-offset fragility for MPC account reads
**What goes wrong:** Adding a field before ciphertext fields in a “ciphertext target account” shifts offsets and breaks MPC arg decoding.  
**How to avoid:** Keep ciphertext in a minimal fixed-layout account (like `MarketPool`), document the offsets, and avoid reordering fields.

### 4) 48-hour windows are hard to test
**What goes wrong:** Anchor tests can’t easily fast-forward on-chain time; you can’t wait 48h in CI.  
**How to avoid:** Parameterize durations via config (defaulting to 48h) or explicitly plan for “manual-only” validation of timing checks.

### 5) “Active dispute” withdrawal lock needs a local counter
**What goes wrong:** If withdrawal logic tries to scan dispute accounts to determine if resolver is active, it can’t (no iteration).  
**How to avoid:** Maintain `active_disputes` on the resolver account and update it when a resolver is selected/unselected.

## Code Examples

### Add plaintext stake weighting to ArgBuilder

Use `ArgBuilder::plaintext_u64` (available in `arcium-anchor` 0.8.5) to pass the stake weight into the circuit:

```rust
// Pattern based on programs/avenir/src/instructions/place_bet.rs and
// arcium-anchor ArgBuilder (0.8.5) supporting plaintext_u64.
let args = ArgBuilder::new()
    .x25519_pubkey(pub_key)
    .plaintext_u128(nonce)
    .encrypted_bool(vote_ciphertext)
    .plaintext_u64(stake_weight)
    .account(dispute_tally.key(), /*offset*/ 16, /*length*/ 64)
    .build();
```

### Callback handler location (important)

MPC callbacks are implemented in `programs/avenir/src/lib.rs` using `#[arcium_callback(encrypted_ix = "...")]` and `verify_output(...)`. Plan Phase 8 to add the new dispute callbacks in the same place to match established wiring.

## Open Questions (planner should resolve before writing PLAN.md)

1) **Juror selection fairness:** Is v1 OK with “caller-provided jurors”, or must selection be registry-driven and deterministic?
2) **Stake snapshot semantics:** Is vote weight (and slashing %) based on stake at selection time, at vote time, or at finalize time?
3) **Minority slashing visibility:** Is it acceptable that minority voters become publicly inferable at dispute finalization time?
4) **Quorum failure behavior:** If voting window ends with <5 votes, do we (a) extend window, (b) add jurors, (c) allow finalize with penalties?
5) **Tie-break flow:** After tie detection, do we keep existing votes and only add one juror vote, or do we restart voting?
6) **USDC reward destination:** Should slashed funds be added to majority stake vaults (compounding) or paid out to wallet ATAs?
7) **Frontend `@arcium-hq/client` version:** Should app be upgraded from `0.5.2` to `0.8.5` for dispute encryption, or keep 0.5.2 and ensure compatibility?

## Sources (local)

### Primary (HIGH confidence)
- `programs/avenir/src/lib.rs` (Arcium callback patterns + output verification)
- `programs/avenir/src/instructions/place_bet.rs` (queue + lock + ArgBuilder pattern)
- `programs/avenir/src/instructions/mpc/update_pool.rs` (MPC account read offsets + callback account vectors)
- `programs/avenir/src/state/market_pool.rs` (fixed-layout ciphertext account rationale)
- `$HOME/.cargo/registry/src/**/arcium-anchor-0.8.5/src/arg_builder.rs` (ArgBuilder supports `plaintext_u64`)
- `.planning/phases/08-dispute-system/08-CONTEXT.md` (locked decisions + UI constraints)
- `.planning/REQUIREMENTS.md` (RES-02..RES-06 definitions)
- `.planning/STATE.md` (DKG blocker + prior MPC decisions)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions are in repo manifests (`Cargo.toml`, `package.json`).
- Architecture: MEDIUM — on-chain patterns are clear, but juror selection + incentives require design choices.
- Pitfalls: HIGH — derived directly from Solana execution constraints and existing MPC patterns.

**Valid until:** 2026-04-03 (re-check if Arcium SDK versions or DKG status changes)
