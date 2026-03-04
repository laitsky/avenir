---
status: resolved
trigger: "Investigate GitHub Actions localnet startup timeout in this repo and recommend the best workaround."
created: 2026-03-03T00:00:00+07:00
updated: 2026-03-03T00:20:00+07:00
---

## Current Focus

hypothesis: Confirmed version skew between the repo's pinned Anchor/Arcium stack and the workflow's floating Solana install is the most plausible cause of the validator never becoming healthy in CI.
test: Summarize the evidence and recommend the least invasive workaround.
expecting: Pinning Solana to the documented 2.3.0 line should restore a compatible localnet startup path in GitHub Actions.
next_action: Report the diagnosis and the recommended workflow change to the user.

## Symptoms

expected: CI should run Arcium/Anchor tests on localnet successfully.
actual: During GitHub Actions, the run prints 'Starting anchor localnet...' and times out waiting for http://127.0.0.1:8899 even after raising Anchor.toml [test].startup_wait to 300000.
errors: 'Localnet crashed during startup: Timeout: Solana localnet at http://127.0.0.1:8899 did not come online in time.'
reproduction: Run the existing .github/workflows/arcium-tests.yml workflow, especially the 'Run MPC tests' step.
started: Current state as of latest commit; latest commit is docs-only.

## Eliminated

## Evidence

- timestamp: 2026-03-03T00:00:00+07:00
  checked: .github/workflows/arcium-tests.yml
  found: CI runs `arcium test --skip-build` after installing Solana CLI, Anchor CLI 0.32.1, Arcium CLI via `arcup`, Bun dependencies, and `arcium build`.
  implication: The failing startup happens under Arcium's test wrapper, not a direct `anchor test` invocation in the workflow.

- timestamp: 2026-03-03T00:00:00+07:00
  checked: Anchor.toml and Arcium.toml
  found: `Anchor.toml` sets `[test].startup_wait = 300000`, while `Arcium.toml` separately sets `[localnet].localnet_timeout_secs = 300`.
  implication: There are two distinct timeout knobs, and only one is definitely owned by Arcium localnet.

- timestamp: 2026-03-03T00:10:00+07:00
  checked: local `arcium` binary strings and CLI help
  found: The `arcium` binary itself contains the exact timeout strings (`Starting anchor localnet...`, `Timeout: Solana localnet at ... did not come online in time`, and the suggestion to increase `startup_wait`), plus a separate default `localnet_timeout_secs = 60`.
  implication: The reported error is emitted by Arcium's wrapper around Anchor, so changing Anchor config only helps if the underlying validator can actually start.

- timestamp: 2026-03-03T00:11:00+07:00
  checked: local tool versions and repo lock state
  found: The local environment currently has `anchor-cli 0.32.1` and `solana-cli 3.0.15`, while the repo depends on Anchor `0.32.1`, Arcium `0.8.5`, and `Cargo.lock` resolves `solana-program` `2.3.0`.
  implication: The project stack is aligned around Solana 2.3.x, but the workflow's `stable` installer can now deliver Solana 3.x.

- timestamp: 2026-03-03T00:12:00+07:00
  checked: local `arcium localnet --skip-build --skip-local-arx-nodes`
  found: Even with ARX nodes skipped, Arcium still validates Docker availability before startup.
  implication: CI needs Docker available, but Docker alone does not explain the validator-specific timeout because the reported failure occurs after Arcium starts waiting on Anchor localnet.

## Resolution

root_cause: The workflow installs Solana with `https://release.anza.xyz/stable/install`, which is a floating dependency. The repo otherwise pins Anchor `0.32.1` and Arcium `0.8.5`, and the documented stack for both aligns to Solana `2.3.0`/`solana-program 2.3.x`. When `stable` advances (for example to Solana CLI 3.x), `arcium test` still launches `anchor localnet`, but the underlying validator start path is no longer on the version combination the project is built and documented against. That makes the validator fail or never become healthy, so Arcium's wait loop eventually times out at `127.0.0.1:8899`; increasing `startup_wait` only waits longer for the same broken startup.
fix: Recommended workaround is to pin the Solana CLI in CI to the same compatible version line the project stack expects instead of installing floating `stable`.
verification: Diagnosis only. The recommended validation is to rerun the workflow after pinning Solana (preferably `2.3.0`) and confirm that `arcium test --skip-build` progresses past `Starting anchor localnet...`.
files_changed: []
