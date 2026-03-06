# Roadmap: Avenir

## Milestones

- ✅ **v1.0 MVP** — Phases 1-12 shipped on 2026-03-05 ([archive roadmap](milestones/v1.0-ROADMAP.md), [archive requirements](milestones/v1.0-REQUIREMENTS.md), [audit](milestones/v1.0-MILESTONE-AUDIT.md))
- 🚧 **v1.0 Post-Audit Gap Closure** — Phases 13-16 planned from the 2026-03-06 milestone audit

## Current Status

- The 2026-03-06 audit reopened `v1.0` because live integration drift broke parts of the archived Phase 11/12 closure and `RTG-01` remains open.
- Active planning is limited to gap-closure phases 13-16. The shipped milestone definition remains archived in `.planning/milestones/v1.0-ROADMAP.md`.
- Deferred optional cleanup from the audit stays out of scope for this pass: `INF-02` runtime validation, `UX-08` evidence cleanup, and manual browser/README verification items.
- Next action: plan `Phase 13`.

## Active Gap Closure Phases

- [x] **Phase 13: Restore Client-Side Encryption Boundary** - Move live bet and vote encryption back to the browser and re-establish nonce-safe payload handling (completed 2026-03-06)
- [x] **Phase 14: Repair Dispute Escalation Account Ordering** - Align `useOpenDispute` with the on-chain juror ordering contract and unblock dispute finalization (completed 2026-03-06)
- [ ] **Phase 15: Wire Market Creation Into Live UI Flow** - Expose `useCreateMarket` in the routed app and restore the create -> init_pool -> bet entrypoint
- [ ] **Phase 16: RTG Publication And Audit Drift Cleanup** - Close `RTG-01`, refresh stale verification evidence, and prepare the milestone for re-audit

## Phase Details

### Phase 13: Restore Client-Side Encryption Boundary
**Goal**: Restore the product's live privacy boundary so bets and juror votes are encrypted client-side again before any transaction or server interaction.
**Depends on**: Phase 7, Phase 8, Phase 12
**Gap Closure**: Closes `BET-02`, `INF-07`, `RES-05`; fixes the audit's frontend/server encryption boundary regressions in betting and dispute flows
**Requirements**: BET-02, INF-07, RES-05
**Success Criteria** (what must be TRUE):
  1. Bet payload encryption happens in the browser and no plaintext bet input reaches `app/src/server/arcium-encryption.ts`
  2. Vote payload encryption happens in the browser and no plaintext juror vote reaches the server encryption path
  3. Bet encryption uses nonce-safe browser payload handling in the live app path by encrypting the full bet payload in one client-side call while preserving the existing one-nonce on-chain interface
  4. Betting and vote hooks submit ciphertext-compatible payloads that match the existing on-chain/MPC interfaces

Plans:
- [ ] 13-01: Move live bet encryption back to the client boundary and restore nonce-safe bet payload handling
- [ ] 13-02: Move dispute vote encryption back to the client boundary and remove plaintext server handoff
- [ ] 13-03: Re-verify encrypted payload handling across the live betting and voting hooks

### Phase 14: Repair Dispute Escalation Account Ordering
**Goal**: Make dispute escalation compatible with the on-chain juror-selection contract so the full dispute lifecycle works again.
**Depends on**: Phase 8, Phase 11
**Gap Closure**: Closes `RES-03`, `RES-06`; fixes the audit's `useOpenDispute` -> `open_dispute` integration mismatch and unblocks the dispute lifecycle
**Requirements**: RES-03, RES-06
**Plans:** 2/2 plans complete
**Success Criteria** (what must be TRUE):
  1. `useOpenDispute` derives or fetches resolver ordering that matches the instruction's deterministic validation
  2. `remaining_accounts` are passed in the exact order expected by `open_dispute`
  3. Escalation succeeds end-to-end and the downstream finalize flow is no longer blocked by account-contract mismatch

Plans:
- [ ] 14-01-PLAN.md -- Fix on-chain seeds to be client-predictable, create shared juror-selection.ts with TDD tests
- [ ] 14-02-PLAN.md -- Wire selectJurors/selectTiebreakerJuror into useOpenDispute and useAddTiebreaker hooks

### Phase 15: Wire Market Creation Into Live UI Flow
**Goal**: Restore the missing routed entrypoint for live market creation so the shipped app can exercise the full create -> init_pool -> bet lifecycle.
**Depends on**: Phase 2, Phase 7, Phase 12
**Gap Closure**: Closes the audit's broken market lifecycle flow where `useCreateMarket` exists but no route invokes it
**Requirements**: Audit flow repair
**Plans:** 2 plans
**Success Criteria** (what must be TRUE):
  1. The routed app exposes a live create-market entrypoint that invokes `useCreateMarket`
  2. Successful market creation leads to an initialized pool path ready for first-bet UX
  3. The create -> init_pool -> bet path is verifiable in the live app instead of being stranded in an unused hook

Plans:
- [ ] 15-01-PLAN.md -- Create useWhitelist hook and wire conditional Create link into Header
- [ ] 15-02-PLAN.md -- Create /create route with form, access gating, and post-creation redirect

### Phase 16: RTG Publication And Audit Drift Cleanup
**Goal**: Close the remaining publication blocker and bring milestone verification artifacts back in sync with the live repo after the code fixes land.
**Depends on**: Phase 13, Phase 14, Phase 15
**Gap Closure**: Closes `RTG-01` and the audit's verification-drift findings for phases 11 and 12
**Requirements**: RTG-01
**Success Criteria** (what must be TRUE):
  1. The GitHub repository is public and RTG judges can access the project without private-repo blockers
  2. Phase 11 and Phase 12 verification artifacts no longer claim behavior contradicted by the live repo
  3. The milestone is ready for a follow-up audit after the gap-closure phases complete

Plans:
- [ ] 16-01: Make the repository public and update RTG submission evidence as needed
- [ ] 16-02: Refresh stale verification artifacts for the reopened dispute/encryption regressions
- [ ] 16-03: Prepare the milestone for re-audit once the gap-closure work is complete
