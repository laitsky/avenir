# Phase 3: Arcium MPC Core - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate the encrypted state relay pattern — prove that ciphertext stored on-chain can be passed into an MPC computation and updated via callback. Build the update_pool circuit, implement client-side encryption with @arcium-hq/client, and benchmark MPC latency. This phase validates the core technical assumption before Phase 5 builds on it. Other MPC circuits (compute_payouts, add_dispute_vote, finalize_dispute) are built in their respective phases.

</domain>

<decisions>
## Implementation Decisions

### POC scope & fidelity
- Full-fidelity update_pool circuit — uses actual market pool types ([u64; 2] PoolTotals), not simplified test data
- Sentiment bucket logic (Leaning Yes / Even / Leaning No) included in update_pool circuit — validates expensive MPC comparison operations early
- Only update_pool circuit built in this phase — compute_payouts (Phase 6), add_dispute_vote and finalize_dispute (Phase 8) built when their phases need them
- Separate hello-world circuit as plan 03-01 to de-risk environment setup before adding circuit complexity
- Plan sequence: hello-world → update_pool circuit → state relay POC → client encryption → latency benchmark

### Testing environment
- Install Docker for local Arcium testing — enables `arcium test` with local Arx nodes for fast iteration
- Devnet deployment for latency benchmark (plan 03-05) — local latency doesn't represent real-world MPC performance
- Fallback: if Docker/local Arcium setup fails, pivot to devnet testing rather than blocking the phase
- Reusable test utilities — create helpers for circuit testing (setup Arcium context, encrypt test data, verify callback) that Phases 5, 6, 8 can reuse

### Latency tolerance
- Target: under 5 seconds for bet placement round-trip (encrypt → submit → MPC → callback → state updated)
- If latency exceeds tolerance: accept for v1, document optimization opportunities, note batched epoch model (SCAL-01) as critical v2 requirement
- Measure full end-to-end flow, not just MPC computation — that's what the user experiences
- Formal BENCHMARK.md document in phase directory — useful for RTG submission (Phase 10) and future optimization decisions

### Ciphertext storage format
- Adjust Market struct fields during POC to match real Arcium ciphertext size — prevents breaking migration later
- **Encrypted state stored in separate MarketPool PDA** (fixed-layout, no variable-length strings) to ensure deterministic byte offsets for `ArgBuilder.account()`. *Revised from original "keep on Market account" decision — Market's variable-length String fields (`question` max 200, `resolution_source` max 128) cause non-deterministic byte offsets per market instance, making `ArgBuilder.account()` reads impossible. MarketPool PDA seeds: `[b"market_pool", market_id.to_le_bytes()]`, created alongside Market in `create_market`. Plaintext fields (sentiment, mpc_lock, total_bets) remain on Market.*
- Functional round-trip validation only — prove ciphertext survives store → read → MPC reprocess → callback. Cryptographic guarantees come from Arcium's framework
- Direct @arcium-hq/client SDK usage for client-side encryption — no wrapper utility layer, the SDK is the abstraction

### Claude's Discretion
- Exact hello-world circuit design for environment validation
- Internal circuit optimization (minimizing expensive operations within Arcis constraints)
- Test harness architecture and helper API design
- Benchmark methodology details and number of test runs
- Error handling patterns for MPC callback failures

</decisions>

<specifics>
## Specific Ideas

- This is the HIGHEST RISK phase — if the encrypted state relay pattern doesn't work, the architecture must be redesigned
- Arcium toolchain: arcis 0.8.5 (not v0.4.0), Arcium CLI v0.8.5, Cerberus MPC backend
- Existing placeholder circuit: `init_pool` in `encrypted-ixs/src/lib.rs` with `PoolTotals = [u64; 2]`
- Market struct already has: `yes_pool_encrypted: [u8; 32]`, `no_pool_encrypted: [u8; 32]`, `sentiment: u8`, `mpc_lock: bool`
- Known constraint: MPC circuits have fixed iteration counts and fixed-size data (no Vec/String), comparisons are expensive (bit decomposition)
- Sentiment bucket uses multiplication-based comparison (not division) per BET-05 requirement
- Docker was explicitly flagged as not installed in Phase 1 — installation is a prerequisite step

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `encrypted-ixs/src/lib.rs`: Placeholder `init_pool` circuit with `PoolTotals = [u64; 2]` type — extend this with update_pool
- `Market` struct (`programs/avenir/src/state/market.rs`): Has encrypted pool fields, sentiment, mpc_lock — target for callback writes
- `Arcium.toml`: Configured for localnet (2 nodes, Cerberus backend) — ready for Docker-based testing
- `arcis = "0.8.5"` dependency in `encrypted-ixs/Cargo.toml`

### Established Patterns
- Anchor 0.32.1 with `#[account]`, `#[derive(InitSpace)]`, PDA seeds pattern
- Market PDA seeded by `[b"market", market_id.to_le_bytes()]`
- MarketVault PDA seeded by `[b"vault", market_id.to_le_bytes()]`
- Handler functions separated from account validation structs

### Integration Points
- MPC callback instruction writes updated ciphertext to MarketPool PDA (fixed-layout, deterministic byte offsets for `ArgBuilder.account()`)
- `mpc_lock: bool` on Market controls sequential access — set before MPC call, cleared in callback
- `sentiment: u8` on Market updated by callback after MPC computes bucket
- Client-side encryption produces ciphertext that maps to MarketPool's `yes_pool_encrypted`/`no_pool_encrypted` field format
- Frontend will use @arcium-hq/client (Phase 7) — patterns established here carry forward

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-arcium-mpc-core*
*Context gathered: 2026-03-03*
