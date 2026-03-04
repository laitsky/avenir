# Phase 8: Dispute System - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Community members can escalate markets that remain unresolved after a 48-hour grace period into an encrypted dispute flow. Approved resolver-pool members (staked in USDC) are selected as jurors; juror votes are encrypted via Arcium MPC; the outcome is determined by a stake-weighted encrypted tally; the market resolves accordingly. The UI shows dispute status under fog and clears fog when the dispute outcome is revealed.

</domain>

<decisions>
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

</decisions>

<specifics>
## Specific Ideas

- Dispute pages should keep the “fog as privacy” metaphor: status is visible, but vote content remains hidden until the reveal.
- Use the same dramatic fog-clear animation style as Phase 7’s resolution reveal, but for: “Jury decided YES/NO”.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- On-chain SPL Token CPI patterns exist in `programs/avenir/src/instructions/place_bet.rs` and `programs/avenir/src/instructions/claim_payout.rs` (useful for staking/withdrawals/slashing transfers).
- Market state already includes `Disputed` (`programs/avenir/src/state/market.rs`), but no dispute instructions exist yet.
- Existing MPC orchestration patterns exist under `programs/avenir/src/instructions/mpc/` (queue/callback/lock patterns to mirror for dispute circuits).
- Frontend fog primitives already exist: `app/src/components/fog/FogOverlay.tsx` and “reveal moment” UX patterns from Phase 7.
- Frontend already maps market states including `Disputed`: `app/src/lib/types.ts`.

### Established Patterns
- Program uses Anchor PDA seeds and “instruction per file” layout in `programs/avenir/src/instructions/`.
- Frontend market detail uses a bet-panel “mode” state machine (Phase 7) — dispute/juror modes should extend this pattern.

### Integration Points
- New dispute state must integrate with:
  - Market state machine (`Market.state`) and any new dispute-related fields/accounts.
  - UI market detail route `app/src/routes/market/$id.tsx` and `BetPlacement` panel composition.
- IDL types used by frontend (`app/src/lib/idl/avenir.*`) must be updated when dispute accounts/instructions are added.

</code_context>

<deferred>
## Deferred Ideas

- Contested creator resolution (challenge window / appeal flow) — out of v1 scope for Phase 8 given “unresolved-only” dispute policy.
- Global alerts/notifications when a market enters dispute — consider Phase 9/v2.
- Per-juror reward/slash breakdown UI — keep v1 focused on the outcome reveal.

</deferred>

---

*Phase: 08-dispute-system*
*Context gathered: 2026-03-04*

