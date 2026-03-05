# Phase 10: RTG Submission - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Open-source the Avenir repo with documentation that clearly explains what data is encrypted, why it matters (anti-herding, anti-manipulation), and how Arcium MPC enables it. Prepare the repo for RTG judge evaluation across Innovation, Technical Implementation, User Experience, Impact, and Clarity.

</domain>

<decisions>
## Implementation Decisions

### README narrative & structure
- Problem-first hook: lead with the herding problem in prediction markets (Polymarket manipulation, crowd following), then reveal Arcium MPC as the solution
- Conceptual Arcium explanation with highlights: explain encrypted state relay pattern at high level, then highlight 1-2 circuits as examples with code snippets, link to source for the rest
- Keep existing getting-started section as-is below the RTG narrative (prerequisites, build, test, run)
- Weave RTG judging criteria naturally through the narrative — don't use explicit RTG criterion labels as section headers

### Architecture diagram
- Mermaid.js diagrams rendered inline by GitHub (version-controlled, no external tools)
- Two-diagram approach: one high-level system overview + one focused encrypted data flow diagram
- Both Arcium showcases diagrammed: encrypted betting flow (update_pool, compute_payouts) AND encrypted dispute flow (add_dispute_vote, finalize_dispute)

### Demo materials
- Screenshots embedded in README as primary demo, optional video walkthrough if time permits
- Fog-focused highlights: 3-4 screenshots showcasing the privacy UX — fog over encrypted pools, fog over sentiment, fog-clear animation (before/after), dispute fog

### Repo cleanup & licensing
- MIT license
- Exclude .planning/ directory entirely from public repo (add to .gitignore)
- Keep git commit history as-is (already clean and phase-structured)
- Quick secrets check before going public (scan for common patterns: private keys, API keys)

### Claude's Discretion
- Visual approach for encrypted vs plaintext distinction in Mermaid diagrams (color-coded vs label-based)
- Screenshot storage location in repo (docs/screenshots/ vs assets/ vs .github/)
- Whether to use mock data or live devnet data for screenshots (given DKG blocker, mock is likely more practical)
- Exact README section ordering and flow

</decisions>

<specifics>
## Specific Ideas

- RTG judges evaluate: Innovation, Technical Implementation, User Experience, Impact, Clarity — the README should naturally demonstrate all five without labeling them
- Two distinct Arcium showcases to highlight: (1) encrypted betting pools preventing herding, (2) encrypted dispute voting preventing jury manipulation
- "Fog" visual metaphor is central to the UX story — screenshots should make this the hero
- Current README has solid developer-facing content that should be preserved, not replaced

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- README.md: Existing developer documentation with architecture tree, account model, MPC circuits, getting started — serves as foundation for expanded RTG version
- 4 MPC circuits in encrypted-ixs/src/lib.rs: init_pool, update_pool, compute_payouts, finalize_dispute — source for code snippet highlights
- FogOverlay component (app/src/components/): The visual fog UX to screenshot
- Forest/fog design tokens: oklch palette already defined in Tailwind theme

### Established Patterns
- Phase-based commit history: Clean, well-structured commits across 12 phases — no cleanup needed
- .gitignore already covers .anchor, target, node_modules, test-ledger — needs .planning/ added
- ISC license currently in README (will be replaced with MIT)

### Integration Points
- README.md: Will be rewritten/expanded (not a new file)
- LICENSE: New file at repo root
- Screenshot directory: New directory for demo images
- .gitignore: Needs .planning/ addition

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-rtg-submission*
*Context gathered: 2026-03-05*
