# Phase 3: Arcium MPC Core - Research

**Researched:** 2026-03-03
**Domain:** Arcium MPC circuits (Arcis), encrypted state relay, client-side encryption
**Confidence:** MEDIUM

## Summary

Phase 3 validates the highest-risk technical assumption in the project: that ciphertext stored on-chain can be passed into an MPC computation and updated via callback. The Arcium ecosystem provides a complete stack for this: the Arcis Rust DSL for writing MPC circuits, the `arcium-anchor` crate for Solana program integration, and `@arcium-hq/client` for client-side encryption. The voting example in Arcium's official repository demonstrates an almost identical pattern to what `update_pool` needs -- encrypted state accumulation with MXE-owned ciphertext stored on-chain, read via `ArgBuilder.account()`, processed in MPC, and written back in callbacks.

The primary risk is environmental: Docker is required for `arcium test` (local testing with Arx nodes) but is not installed. The CONTEXT.md decision allows pivoting to devnet-only testing if local setup fails. The secondary risk is ciphertext field sizing: the current Market struct uses `[u8; 32]` per encrypted field, which matches the Arcium pattern (each encrypted value = one 32-byte ciphertext element), but the VoteStats pattern shows that a struct like `PoolTotals { yes: u64, no: u64 }` produces a `[[u8; 32]; 2]` output (two ciphertexts), so the Market struct fields align correctly (separate `yes_pool_encrypted` and `no_pool_encrypted` fields).

**Primary recommendation:** Follow the Arcium voting example pattern directly -- use `Enc<Mxe, T>` for persistent on-chain pool state, `Enc<Shared, T>` for user bet inputs, `ArgBuilder.account()` to pass on-chain ciphertext to MPC, and callbacks to write updated ciphertext back.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-fidelity update_pool circuit -- uses actual market pool types ([u64; 2] PoolTotals), not simplified test data
- Sentiment bucket logic (Leaning Yes / Even / Leaning No) included in update_pool circuit -- validates expensive MPC comparison operations early
- Only update_pool circuit built in this phase -- compute_payouts (Phase 6), add_dispute_vote and finalize_dispute (Phase 8) built when their phases need them
- Separate hello-world circuit as plan 03-01 to de-risk environment setup before adding circuit complexity
- Plan sequence: hello-world -> update_pool circuit -> state relay POC -> client encryption -> latency benchmark
- Install Docker for local Arcium testing -- enables `arcium test` with local Arx nodes for fast iteration
- Devnet deployment for latency benchmark (plan 03-05) -- local latency doesn't represent real-world MPC performance
- Fallback: if Docker/local Arcium setup fails, pivot to devnet testing rather than blocking the phase
- Reusable test utilities -- create helpers for circuit testing (setup Arcium context, encrypt test data, verify callback) that Phases 5, 6, 8 can reuse
- Target: under 5 seconds for bet placement round-trip (encrypt -> submit -> MPC -> callback -> state updated)
- If latency exceeds tolerance: accept for v1, document optimization opportunities, note batched epoch model (SCAL-01) as critical v2 requirement
- Measure full end-to-end flow, not just MPC computation -- that's what the user experiences
- Formal BENCHMARK.md document in phase directory -- useful for RTG submission (Phase 10) and future optimization decisions
- Adjust Market struct fields during POC to match real Arcium ciphertext size -- prevents breaking migration later
- Keep encrypted state on Market account (current design) -- simpler, one account holds everything
- Functional round-trip validation only -- prove ciphertext survives store -> read -> MPC reprocess -> callback
- Direct @arcium-hq/client SDK usage for client-side encryption -- no wrapper utility layer

### Claude's Discretion
- Exact hello-world circuit design for environment validation
- Internal circuit optimization (minimizing expensive operations within Arcis constraints)
- Test harness architecture and helper API design
- Benchmark methodology details and number of test runs
- Error handling patterns for MPC callback failures

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INF-02 | Four MPC circuits: update_pool, compute_payouts, add_dispute_vote, finalize_dispute | This phase builds only update_pool. Research covers Arcis circuit structure (`#[encrypted]` module, `#[instruction]` functions, `Enc<Mxe, T>` / `Enc<Shared, T>` types), the VoteStats accumulation pattern from the voting example, and sentiment bucket comparison using multiplication. Other circuits deferred to Phases 6 and 8. |
| INF-03 | Encrypted state relay pattern -- ciphertext stored on-chain, passed to MPC, updated via callback | Research documents the complete relay flow: `ArgBuilder.account()` reads ciphertext from on-chain account at byte offset, MPC decrypts via `.to_arcis()`, computes, re-encrypts via `.from_arcis()`, and `#[arcium_callback]` writes `o.ciphertexts` and `o.nonce` back to the account. Validated by voting example. |
| INF-07 | Client-side encryption via @arcium-hq/client (x25519 key exchange, RescueCipher) | Research documents the complete client encryption flow: x25519 keypair generation, shared secret derivation with MXE public key, RescueCipher instantiation, `cipher.encrypt(plaintext, nonce)` producing 32-byte ciphertext arrays, and `cipher.decrypt()` for result verification. SDK version 0.5.2 confirmed. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| arcis | 0.8.5 | Rust DSL for writing MPC circuits | Only way to write Arcium circuits; compiles to MPC-executable format |
| arcium-anchor | 0.8.5 | Anchor integration for Arcium (macros, ArgBuilder, callbacks) | Required glue between Anchor programs and Arcium MPC network |
| arcium-client | 0.8.5 | Rust-side Arcium client utilities (CircuitSource, circuit_hash!) | Needed for comp_def initialization and circuit storage |
| arcium-macros | 0.8.5 | Helper macros (circuit_hash!, comp_def_offset) | Compile-time circuit configuration |
| @arcium-hq/client | 0.5.2 | TypeScript SDK for encryption, PDA derivation, computation lifecycle | Client-side encryption and test orchestration |
| anchor-lang | 0.32.1 | Solana program framework (already in project) | Required by arcium-anchor 0.8.5 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @arcium-hq/reader | latest | Read/monitor on-chain Arcium state | Fetching computation status, cluster info in tests |
| Docker Desktop | latest | Run local Arx nodes via `arcium test` | Local circuit testing before devnet deployment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local Docker testing | Devnet-only testing | Slower iteration but no Docker dependency; use as fallback per CONTEXT.md |
| `Enc<Mxe, T>` for pool state | `Enc<Shared, T>` for pool state | Shared requires a specific client's public key; Mxe lets the MXE collectively manage the key, which is correct for persistent state that outlives any single user session |

**Installation:**
```bash
# Rust crates (add to programs/avenir/Cargo.toml)
# arcium-anchor = "0.8.5"
# arcium-client = { version = "0.8.5", default-features = false }
# arcium-macros = "0.8.5"

# TypeScript (root package)
bun add @arcium-hq/client

# Docker (macOS)
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
```

## Architecture Patterns

### Recommended Project Structure
```
encrypted-ixs/
├── src/
│   └── lib.rs              # All MPC circuits (init_pool, update_pool)
├── Cargo.toml              # arcis = "0.8.5"
programs/avenir/src/
├── instructions/
│   ├── mpc/
│   │   ├── mod.rs           # MPC instruction module
│   │   ├── init_pool.rs     # Queue init_pool MPC computation
│   │   ├── update_pool.rs   # Queue update_pool MPC computation
│   │   ├── init_pool_callback.rs   # Handle init_pool result
│   │   └── update_pool_callback.rs # Handle update_pool result, write to Market
│   └── ...existing instructions...
├── state/
│   └── market.rs            # Market struct (adjust encrypted fields if needed)
└── lib.rs                   # Add #[arcium_program], new instruction handlers
Arcium.toml                  # Localnet + devnet cluster config
tests/
└── mpc/                     # MPC-specific test files
    ├── helpers.ts            # Reusable test utilities (encrypt, setup, verify)
    ├── hello-world.ts        # Environment validation test
    └── update-pool.ts        # update_pool circuit integration test
```

### Pattern 1: Encrypted State Relay (Store-Read-Compute-Write)
**What:** Ciphertext lives on a Solana account. MPC reads it, computes on it, writes updated ciphertext back via callback.
**When to use:** Any time persistent encrypted state needs to be updated (pool totals, vote counts, dispute tallies).
**Example:**
```rust
// Source: https://github.com/arcium-hq/examples/tree/main/voting
// Circuit (encrypted-ixs/src/lib.rs):
#[instruction]
pub fn update_pool(
    bet_ctxt: Enc<Shared, BetInput>,       // User's encrypted bet
    pool_ctxt: Enc<Mxe, PoolTotals>,       // Current encrypted pool state from on-chain
) -> (Enc<Mxe, PoolTotals>, Enc<Mxe, SentimentResult>) {
    let bet = bet_ctxt.to_arcis();
    let mut pool = pool_ctxt.to_arcis();
    // Update pool totals
    if bet.is_yes {
        pool.yes += bet.amount;
    } else {
        pool.no += bet.amount;
    }
    // Compute sentiment bucket using multiplication (not division)
    // ... sentiment logic ...
    (pool_ctxt.owner.from_arcis(pool), pool_ctxt.owner.from_arcis(sentiment))
}

// Anchor program (queue computation):
let args = ArgBuilder::new()
    .x25519_pubkey(pub_key)           // For Enc<Shared, BetInput>
    .plaintext_u128(nonce)
    .encrypted_bool(is_yes_ciphertext)   // bet.is_yes
    .encrypted_u64(amount_ciphertext)    // bet.amount
    .account(                             // For Enc<Mxe, PoolTotals> - reads from on-chain
        ctx.accounts.market.key(),
        MARKET_ENCRYPTED_OFFSET,          // Skip discriminator + fields before encrypted data
        64,                               // 2 x 32 bytes (yes_pool + no_pool ciphertexts)
    )
    .build();

// Callback (write results back):
#[arcium_callback(encrypted_ix = "update_pool")]
pub fn update_pool_callback(
    ctx: Context<UpdatePoolCallback>,
    output: SignedComputationOutputs<UpdatePoolOutput>,
) -> Result<()> {
    let o = output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    )?;
    // Write updated ciphertext back to Market account
    ctx.accounts.market.yes_pool_encrypted = o.ciphertexts[0];
    ctx.accounts.market.no_pool_encrypted = o.ciphertexts[1];
    ctx.accounts.market.nonce = o.nonce;
    // Sentiment from second output (if separate)
    // ...
    ctx.accounts.market.mpc_lock = false;  // Release sequential lock
    Ok(())
}
```

### Pattern 2: Client-Side Encryption for User Inputs
**What:** User encrypts their bet data client-side using x25519 shared secret with the MXE, then submits ciphertext on-chain.
**When to use:** Any user-submitted private data (bets, votes, dispute votes).
**Example:**
```typescript
// Source: https://ts.arcium.com/docs
import { RescueCipher, x25519, getMXEPublicKey, deserializeLE } from "@arcium-hq/client";
import { randomBytes } from "crypto";

// 1. Derive shared secret
const privateKey = x25519.utils.randomSecretKey();
const publicKey = x25519.getPublicKey(privateKey);
const mxePublicKey = await getMXEPublicKey(provider, programId);
const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
const cipher = new RescueCipher(sharedSecret);

// 2. Encrypt bet input
const isYes = BigInt(1);    // true = yes bet
const amount = BigInt(1_000_000);  // 1 USDC in lamports
const plaintext = [isYes, amount];
const nonce = randomBytes(16);
const ciphertext = cipher.encrypt(plaintext, nonce);
// ciphertext[0] = 32-byte encrypted isYes
// ciphertext[1] = 32-byte encrypted amount

// 3. Submit to program
await program.methods
  .updatePool(
    computationOffset,
    Array.from(ciphertext[0]),   // encrypted is_yes
    Array.from(ciphertext[1]),   // encrypted amount
    Array.from(publicKey),
    new anchor.BN(deserializeLE(nonce).toString()),
  )
  .accountsPartial({
    market: marketPda,
    computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
    clusterAccount: getClusterAccAddress(clusterOffset),
    mxeAccount: getMXEAccAddress(program.programId),
    mempoolAccount: getMempoolAccAddress(clusterOffset),
    executingPool: getExecutingPoolAccAddress(clusterOffset),
    compDefAccount: getCompDefAccAddress(program.programId, compDefIndex),
  })
  .rpc({ commitment: "confirmed" });
```

### Pattern 3: Computation Definition Initialization (One-Time Setup)
**What:** Each MPC circuit needs a computation definition account initialized on-chain before it can be used.
**When to use:** Program deployment / first-time setup.
**Example:**
```rust
// Source: https://docs.arcium.com/developers/program
use arcium_anchor::prelude::*;

const COMP_DEF_OFFSET_UPDATE_POOL: u32 = comp_def_offset("update_pool");

pub fn init_update_pool_comp_def(ctx: Context<InitUpdatePoolCompDef>) -> Result<()> {
    init_comp_def(ctx.accounts, None, None)?;
    Ok(())
}

#[init_computation_definition_accounts("update_pool")]
#[derive(Accounts)]
pub struct InitUpdatePoolCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... standard Arcium accounts generated by macro
}
```

### Anti-Patterns to Avoid
- **Using `Enc<Shared, T>` for persistent on-chain state:** Shared requires a specific client keypair for decryption. Use `Enc<Mxe, T>` for state that must persist across multiple users and sessions. The MXE collectively manages the key.
- **Storing nonce in a separate account:** Keep the nonce alongside the ciphertext on the same account (e.g., Market). The MXE increments the nonce by 1 after decrypting inputs, and the callback writes the new nonce back.
- **Division in MPC circuits for sentiment calculation:** Division requires expensive bit decomposition. Use multiplication-based comparison instead (e.g., `yes_pool * 2 > total` rather than `yes_pool / total > 0.5`).
- **Creating accounts inside callbacks:** Callback accounts must already exist. Create them during the queue_computation transaction (user pays rent).
- **Using `Vec` or `String` in circuits:** Arcis circuits require fixed-size data types only. Use fixed-size arrays and structs.
- **Changing the #[program] macro to #[arcium_program] on the existing avenir module:** The `#[arcium_program]` macro wraps `#[program]`. If the existing program already uses `#[program]`, switching to `#[arcium_program]` is required to enable Arcium integration. This is a one-time migration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| x25519 key exchange | Custom ECDH implementation | `@arcium-hq/client` x25519 module | Crypto-grade implementation, Arcium-specific field parameters |
| Rescue cipher encryption | Custom symmetric cipher | `RescueCipher` from `@arcium-hq/client` | Arithmetization-oriented cipher matching MPC circuit expectations |
| PDA derivation for Arcium accounts | Manual seed calculations | `getComputationAccAddress()`, `getMXEAccAddress()`, etc. | Complex multi-seed PDAs that must match Arcium program expectations |
| Computation lifecycle management | Custom polling/status tracking | `awaitComputationFinalization()` | Handles retries, status transitions, and timeout |
| Circuit compilation | Manual MPC protocol generation | `arcium build` CLI command | Compiles Arcis to MPC-executable format with metadata |
| Argument serialization for MPC | Manual byte packing | `ArgBuilder` with typed methods | Order-dependent, type-specific serialization matching circuit expectations |

**Key insight:** The Arcium stack is vertically integrated -- cipher, key exchange, argument serialization, PDA derivation, and circuit compilation all must use Arcium-provided implementations because they share protocol-specific constants and formats (Rescue cipher over Curve25519 base field, specific nonce layout, etc.).

## Common Pitfalls

### Pitfall 1: Market Struct Byte Offset Miscalculation
**What goes wrong:** `ArgBuilder.account()` reads ciphertext from a Solana account at a byte offset. If the offset is wrong, the MPC receives garbage data and produces incorrect results (silently -- no error, just wrong ciphertext).
**Why it happens:** Anchor accounts have an 8-byte discriminator prefix, then fields in declaration order. Adding or reordering fields in the Market struct changes the offset without compiler warnings.
**How to avoid:** Calculate the offset programmatically: sum the sizes of all fields before `yes_pool_encrypted` (discriminator + id + question_len + question + resolution_source_len + resolution_source + category + resolution_time + state + winning_outcome). Write a helper constant or function for this. Test by serializing a known Market and verifying the bytes at the offset.
**Warning signs:** MPC callback returns seemingly valid ciphertext but decrypting gives nonsensical values.

### Pitfall 2: Nonce Desynchronization
**What goes wrong:** The MXE increments the nonce by 1 after decrypting inputs. If the on-chain nonce is not updated in the callback, subsequent computations will fail to decrypt the ciphertext.
**Why it happens:** Forgetting to write `o.nonce` back to the account in the callback, or using a stale nonce when constructing `ArgBuilder` for `Enc<Mxe, T>` arguments.
**How to avoid:** Always update the account's nonce field in the callback: `ctx.accounts.market.nonce = o.nonce;`. For `Enc<Mxe, T>` args, the nonce is read from the account via `ArgBuilder.account()` (it's included in the byte range).
**Warning signs:** First computation succeeds, second one fails or produces garbage.

### Pitfall 3: Market Struct Needs a Nonce Field
**What goes wrong:** The current Market struct does not have a `nonce` field. Arcium's `Enc<Mxe, T>` pattern requires storing the nonce alongside the ciphertext so subsequent computations can decrypt previous state.
**Why it happens:** The Market struct was designed before Arcium integration details were researched.
**How to avoid:** Add a `nonce: u128` field to the Market struct. The voting example uses `nonce: u128` on PollAccount. This is required for the encrypted state relay to work across multiple MPC calls.
**Warning signs:** Cannot construct correct `ArgBuilder` arguments for reading on-chain encrypted state.

### Pitfall 4: Expensive MPC Comparison Operations
**What goes wrong:** Comparison operators (`>`, `<`, `>=`, `<=`) in MPC require bit decomposition, which is significantly more expensive than addition or multiplication. A circuit with many comparisons may exceed latency targets.
**Why it happens:** MPC operates on secret-shared arithmetic values. Comparison requires converting to binary representation, comparing bit by bit, then converting back -- orders of magnitude more expensive than a single addition.
**How to avoid:** Minimize comparisons. For sentiment buckets, use multiplication-based comparison: `yes_pool * 2 > (yes_pool + no_pool)` instead of `yes_pool / total > 0.5`. Use at most 2 comparisons for the 3 sentiment buckets (Leaning Yes / Even / Leaning No). Profile circuit compilation output for operation count.
**Warning signs:** `arcium build` succeeds but circuit execution is much slower than expected.

### Pitfall 5: Docker Not Installed
**What goes wrong:** `arcium test` requires Docker to spin up local Arx nodes. Without Docker, local testing is impossible.
**Why it happens:** Docker was explicitly flagged as not installed during Phase 1 (see STATE.md [01-03]).
**How to avoid:** Install Docker Desktop as the first task in Phase 3. Fallback: if Docker fails, skip local testing and deploy directly to devnet (devnet cluster offset 456).
**Warning signs:** `arcium test` fails with "Docker not found" or container startup errors.

### Pitfall 6: Callback Account Must Be Mutable and Pre-existing
**What goes wrong:** The callback tries to write to the Market account but the account is not marked mutable, or the callback tries to create new accounts.
**Why it happens:** Callbacks are executed by Arx nodes, not the user. Account creation requires rent payment from a signer, which the callback does not have.
**How to avoid:** Mark Market account as `#[account(mut)]` in the callback struct. Pass it via `CallbackAccount { pubkey: market_key, is_writable: true }` in the `callback_ix()` call. The Market account already exists (created in create_market instruction).
**Warning signs:** Callback transaction fails with "account not writable" or "insufficient funds for rent" errors.

## Code Examples

Verified patterns from official sources:

### Circuit: Encrypted State Accumulation (from Voting Example)
```rust
// Source: https://github.com/arcium-hq/examples/tree/main/voting
use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct VoteStats {
        yes: u64,
        no: u64,
    }

    pub struct UserVote {
        vote: bool,
    }

    // Initialize empty encrypted state
    #[instruction]
    pub fn init_vote_stats() -> Enc<Mxe, VoteStats> {
        let vote_stats = VoteStats { yes: 0, no: 0 };
        Mxe::get().from_arcis(vote_stats)
    }

    // Accumulate encrypted input into encrypted state
    #[instruction]
    pub fn vote(
        vote_ctxt: Enc<Shared, UserVote>,
        vote_stats_ctxt: Enc<Mxe, VoteStats>,
    ) -> Enc<Mxe, VoteStats> {
        let user_vote = vote_ctxt.to_arcis();
        let mut vote_stats = vote_stats_ctxt.to_arcis();
        if user_vote.vote {
            vote_stats.yes += 1;
        } else {
            vote_stats.no += 1;
        }
        vote_stats_ctxt.owner.from_arcis(vote_stats)
    }
}
```

### Anchor: Passing On-Chain State to MPC via ArgBuilder.account()
```rust
// Source: https://github.com/arcium-hq/examples/tree/main/voting (adapted)
// The .account() method tells MPC nodes to read ciphertext directly from a Solana account
let args = ArgBuilder::new()
    .x25519_pubkey(pub_key)           // Required before Enc<Shared, T> ciphertexts
    .plaintext_u128(nonce)            // Client nonce
    .encrypted_bool(vote_ciphertext)  // Enc<Shared, UserVote> field
    .account(                          // Enc<Mxe, VoteStats> -- read from on-chain
        ctx.accounts.poll_acc.key(),   // Account public key
        8 + 1,                         // Byte offset: 8 (discriminator) + 1 (bump)
        32 * 2,                        // Length: 2 ciphertexts * 32 bytes each
    )
    .build();
```

### Anchor: Callback Writing State Back
```rust
// Source: https://github.com/arcium-hq/examples/tree/main/voting (adapted)
#[arcium_callback(encrypted_ix = "vote")]
pub fn vote_callback(
    ctx: Context<VoteCallback>,
    output: SignedComputationOutputs<VoteOutput>,
) -> Result<()> {
    let o = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(VoteOutput { field_0 }) => field_0,
        Err(e) => {
            msg!("Computation failed: {}", e);
            return Err(ErrorCode::AbortedComputation.into());
        }
    };
    // Write updated ciphertext back to on-chain account
    ctx.accounts.poll_acc.vote_state = o.ciphertexts;
    ctx.accounts.poll_acc.nonce = o.nonce;
    Ok(())
}
```

### TypeScript: Complete Encryption and Submission Flow
```typescript
// Source: https://ts.arcium.com/docs
import {
  RescueCipher, x25519, getArciumEnv, getMXEPublicKey,
  getComputationAccAddress, getClusterAccAddress, getMXEAccAddress,
  getMempoolAccAddress, getExecutingPoolAccAddress, getCompDefAccAddress,
  getCompDefAccOffset, awaitComputationFinalization, deserializeLE,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";
import * as anchor from "@coral-xyz/anchor";

// Setup encryption
const arciumEnv = getArciumEnv();
const privateKey = x25519.utils.randomSecretKey();
const publicKey = x25519.getPublicKey(privateKey);
const mxePublicKey = await getMXEPublicKey(provider, programId);
const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
const cipher = new RescueCipher(sharedSecret);

// Encrypt user input
const plaintext = [BigInt(1), BigInt(1_000_000)]; // [is_yes, amount]
const nonce = randomBytes(16);
const ciphertext = cipher.encrypt(plaintext, nonce);
const computationOffset = new anchor.BN(randomBytes(8), "hex");

// Queue computation
const compDefIndex = Buffer.from(getCompDefAccOffset("update_pool")).readUInt32LE();
await program.methods
  .updatePool(
    computationOffset,
    Array.from(ciphertext[0]),
    Array.from(ciphertext[1]),
    Array.from(publicKey),
    new anchor.BN(deserializeLE(nonce).toString()),
  )
  .accountsPartial({
    market: marketPda,
    computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, computationOffset),
    clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
    mxeAccount: getMXEAccAddress(program.programId),
    mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
    executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
    compDefAccount: getCompDefAccAddress(program.programId, compDefIndex),
  })
  .rpc({ skipPreflight: true, commitment: "confirmed" });

// Wait for MPC finalization
await awaitComputationFinalization(provider, computationOffset, programId, "confirmed");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| arcium-anchor 0.3.x with separate bool param in init_comp_def | arcium-anchor 0.8.5 with `init_comp_def(ctx.accounts, None, None)` | v0.4.0 migration | Simplified API, removed deprecated parameter |
| Anchor 0.31.1 | Anchor 0.32.1 | v0.4.0 migration | Required by arcium-anchor 0.8.5 (project already uses 0.32.1) |
| Rust 1.88.0 for Arcium | Rust 1.89.0+ | v0.4.0 migration | Project uses 1.93.0, compatible |
| Custom proc-macro2 patch | Removed in v0.4.0 | v0.4.0 migration | No longer needed |
| `@arcium-hq/client` 0.3.x | `@arcium-hq/client` 0.5.2 | Ongoing updates | Latest stable with Rescue cipher improvements |

**Deprecated/outdated:**
- arcium-anchor 0.3.x API: `init_comp_def(ctx.accounts, true, 0, None, None)` -- first bool parameter removed in 0.4.0+
- The project's REQUIREMENTS.md mentions "Arcium v0.4.0" for INF-01, but actual versions are 0.8.5 across all crates -- requirements doc has stale version reference

## Open Questions

1. **Market struct byte offset for encrypted fields**
   - What we know: `ArgBuilder.account()` needs the exact byte offset of `yes_pool_encrypted` within the serialized Market account. The offset depends on all preceding fields' sizes, including variable-length String fields (`question` max 200 chars, `resolution_source` max 128 chars).
   - What's unclear: Anchor serializes String fields with a 4-byte length prefix + variable content. With variable-length strings, the offset is not constant across markets. This may require either: (a) using fixed-size fields for question/resolution_source, or (b) storing encrypted pool data in a separate fixed-layout account.
   - Recommendation: **HIGH PRIORITY.** Investigate whether `ArgBuilder.account()` can handle variable offsets. If not, the simplest fix is moving encrypted fields to a separate `MarketPool` PDA with fixed layout (no strings). The voting example uses a simple fixed-layout `PollAccount`. Resolve this in plan 03-02 before implementing the state relay POC.

2. **Multiple return values from circuits**
   - What we know: `update_pool` needs to return both updated pool totals AND the sentiment bucket. The circuit can return a tuple or struct.
   - What's unclear: How multiple `Enc<Mxe, T>` return values map to `o.ciphertexts` array indexing in the callback. The voting example returns a single `Enc<Mxe, VoteStats>` with 2 ciphertexts.
   - Recommendation: Start with a single struct return (`PoolResult { yes: u64, no: u64, sentiment: u8 }`) that produces 3 ciphertexts. Test indexing in the hello-world or update_pool POC. If sentiment needs to be plaintext (for on-chain storage as `u8`), investigate `reveal()` within the circuit to return it as plaintext.

3. **Sentiment as plaintext vs ciphertext**
   - What we know: The Market struct stores `sentiment: u8` as a plaintext value (visible on-chain). The circuit computes it from encrypted pool totals.
   - What's unclear: Whether the circuit should `reveal()` the sentiment value (making it plaintext in the return) or return it encrypted and have the callback decrypt it. `reveal()` is demonstrated in the voting example for the final result.
   - Recommendation: Use `reveal()` for sentiment since it's intentionally public data. This avoids storing additional ciphertext for a value that's meant to be visible. Pattern: `let sentiment_value = compute_sentiment(pool).reveal(); return (pool_ctxt.owner.from_arcis(pool), sentiment_value);`

4. **Actual MPC latency on devnet**
   - What we know: Arcium claims 5-100 computations/second depending on complexity. No published benchmarks for specific circuit sizes. The voting example is simple (increment counter + comparison).
   - What's unclear: How `update_pool` with addition + 2 comparisons (sentiment) will perform. End-to-end latency includes network round-trips to Arx nodes.
   - Recommendation: This is the purpose of plan 03-05 (latency benchmark). Accept that latency is unknown until measured. The 5-second target is aspirational; document actual results in BENCHMARK.md.

5. **arcium-anchor version discrepancy**
   - What we know: `cargo search` shows arcium-anchor 0.8.5 on crates.io. The voting example Cargo.toml uses 0.8.5. Earlier search showed 0.3.1 on a crates.io page, but this appears to be a cached/old result.
   - What's unclear: Whether 0.8.5 requires any additional configuration beyond what the v0.4.0 migration guide covers.
   - Recommendation: Use 0.8.5 directly. The migration guide from 0.3.x to 0.4.0 documents the major breaking changes; 0.8.5 follows the same patterns shown in the voting example. Validate during hello-world implementation (plan 03-01).

## Sources

### Primary (HIGH confidence)
- [Arcium Official Docs - Encryption Overview](https://docs.arcium.com/developers/encryption) - Enc types, Rescue cipher, nonce management
- [Arcium Official Docs - Program Integration](https://docs.arcium.com/developers/program) - ArgBuilder, queue_computation, callback accounts
- [Arcium Official Docs - Callback Accounts](https://docs.arcium.com/developers/program/callback-accs) - Writing state back, CallbackAccount struct, mutability
- [Arcium Official Docs - Deployment](https://docs.arcium.com/developers/deployment) - Devnet offset 456, build/deploy commands
- [Arcium Official Docs - Hello World](https://docs.arcium.com/developers/hello-world) - Complete circuit + program + test example
- [Arcium Official Docs - Sealing/Re-encryption](https://docs.arcium.com/developers/encryption/sealing) - Enc<Mxe> vs Enc<Shared>
- [Arcium Official Docs - Arcis DSL](https://docs.arcium.com/developers/arcis) - Circuit constraints, supported types
- [Arcium TS SDK Quick Start](https://ts.arcium.com/docs) - Complete TypeScript encryption flow
- [Arcium TS SDK API Reference](https://ts.arcium.com/api/client) - All exported functions, classes, PDA helpers
- [arcium-anchor on crates.io](https://crates.io/crates/arcium-anchor) - v0.8.5 confirmed
- [arcium-hq/examples on GitHub](https://github.com/arcium-hq/examples) - Voting, blackjack, sealed-bid examples
- [Voting example circuit](https://github.com/arcium-hq/examples/tree/main/voting) - Exact pattern for encrypted state accumulation

### Secondary (MEDIUM confidence)
- [Arcium v0.3 to v0.4 Migration Guide](https://docs.arcium.com/developers/migration/migration-v0.3-to-v0.4) - Breaking changes, version requirements
- [Helius Blog - Arcium Privacy 2.0](https://www.helius.dev/blog/solana-privacy) - Architecture overview, MXE explanation
- [Arcium Mainnet Alpha (Messari)](https://messari.io/report/arcium-mainnet-alpha-release) - Performance claims (5-100 comp/sec)

### Tertiary (LOW confidence)
- MPC latency benchmarks: No published data for specific circuit complexities. "5-100 computations per second" is a general claim without methodology. Actual latency for update_pool must be measured empirically in plan 03-05.
- `deriveEncryptionKey` helper seen in voting test: Not documented in official SDK docs. May be a convenience wrapper in the example. Use raw `x25519.utils.randomSecretKey()` as shown in official quick start.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All crate versions verified on crates.io (0.8.5), SDK version confirmed (0.5.2), CLI version matches (0.8.5)
- Architecture: HIGH - Voting example is a near-identical pattern to update_pool; callback state relay pattern documented in official docs with code examples
- Pitfalls: MEDIUM - Byte offset calculation for variable-length Market struct is a real concern with no clear resolution yet; nonce management pattern is documented but easy to miss
- MPC performance: LOW - No published benchmarks; 5-second target is aspirational and must be validated empirically

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days -- Arcium stack is relatively stable at 0.8.5)
