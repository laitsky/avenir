---
status: investigating
trigger: "Investigate issue: solana-localnet-startup-timeout"
created: 2026-03-03T12:10:04Z
updated: 2026-03-03T12:10:04Z
---

## Current Focus

hypothesis: The localnet startup failure is caused by CI environment or test launcher configuration, not insufficient timeout values.
test: Inspect the workflow and local test entrypoints to find what actually starts Solana and why it exits before binding `127.0.0.1:8899`.
expecting: If startup is failing before bind, logs or config should show a missing dependency, incompatible environment, or an early process crash.
next_action: Gather initial evidence from the local test toolchain and startup scripts.

## Symptoms

expected: CI should start the Solana localnet and run tests successfully.
actual: Localnet never becomes reachable before timeout; the runner reports localnet crashed during startup.
errors: `Timeout: Solana localnet at http://127.0.0.1:8899 did not come online in time. Large programs may require more startup time.` Then cleanup, then `Error: Localnet crashed during startup`.
reproduction: Run the GitHub Actions workflow `.github/workflows/arcium-tests.yml`, specifically the `arcium test` step.
started: User reports increasing `startup_wait` three times did not resolve it.

## Eliminated

## Evidence

- timestamp: 2026-03-03T12:10:04Z
  checked: `Anchor.toml`, `Arcium.toml`, and `.github/workflows/arcium-tests.yml`
  found: Anchor `startup_wait` is already `300000`, and Arcium `localnet_timeout_secs` is `300`, while CI still fails at startup.
  implication: The repeated timeout increases already cover both Anchor and Arcium config knobs, so the failure likely comes from an early crash rather than an insufficient wait threshold.

## Resolution

root_cause:
fix:
verification:
files_changed: []
