# Phase 12: Pool Init & Encryption Hardening - Research

**Researched:** 2026-03-04
**Domain:** Arcium MPC pool initialization, RescueCipher nonce safety, Solana transaction chaining
**Confidence:** HIGH

## Summary

Phase 12 closes two integration gaps from the v1.0 audit. **INT-03**: the `init_pool` MPC computation is not auto-triggered after `create_market`, so new markets have zero-filled MarketPool ciphertext that causes `update_pool` failures on the first bet. **INT-05**: the `encryptBetForMPC` function in `encryption.ts` reuses the same nonce for both `cipher.encrypt()` calls (isYes and amount), which with a stream cipher like RescueCipher allows XOR-based plaintext relationship leakage.

The init_pool fix is a frontend-only concern: create a new `useCreateMarket` hook that chains `create_market` TX followed by `init_pool` TX, plus add a UI gate in BetPlacement to block betting until MarketPool has non-zero ciphertext. The nonce fix requires coordinated changes across three layers: (1) `encryption.ts` must generate two separate nonces, (2) the on-chain `place_bet` instruction must accept a second nonce parameter, and (3) the ArgBuilder call must pass both nonces. The simplest nonce approach is deterministic derivation (nonce2 = nonce1 + 1) since it avoids changing the on-chain function signature -- only the ArgBuilder needs to send two `plaintext_u128` values instead of one.

**Primary recommendation:** Use deterministic nonce derivation (nonce + 1 for the second field) to fix INT-05 without altering the place_bet function signature, and model useCreateMarket on the existing useOpenDispute multi-TX chaining pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Frontend auto-chains `create_market` + `init_pool` as two sequential transactions
- New `useCreateMarket` hook encapsulates the full flow: create_market TX -> init_pool TX
- Auto-retry init_pool up to 3 times on failure; show toast error only if all retries fail
- Fire-and-forget: hook resolves after init_pool TX is confirmed on-chain, does NOT wait for MPC callback to complete
- Market is created immediately; pool initializes asynchronously via MPC
- UI gate on bet panel: check MarketPool ciphertext bytes; if all zeros (uninitialized), show "Market initializing..." with spinner instead of bet form
- Auto-refresh until pool state changes to valid encrypted data
- Permissionless recovery: if pool remains uninitialized after timeout (~30s), show an "Initialize Pool" button any user can click (init_pool has no access control -- just needs a payer)
- Fix nonce reuse in `encryption.ts` -- currently lines 53-54 pass the same nonce to both `cipher.encrypt` calls for isYes and amount
- Each ciphertext must use a unique nonce to prevent plaintext relationship leakage
- Audit all encrypt callsites across the frontend (useCastVote, JurorVotePanel, etc.) for the same issue

### Claude's Discretion
- Nonce generation strategy (separate random nonces vs sequential from base)
- On-chain nonce parameter approach (two nonces in place_bet signature vs derive second from first)
- Polling vs WebSocket subscription for pool initialization status detection
- Exact timeout duration before showing "Initialize Pool" recovery button

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BET-01 | User can place a Yes or No bet on a binary market with USDC (minimum $1) | init_pool auto-trigger ensures pool is ready before first bet; UI gate prevents betting on uninitialized pools |
| BET-02 | User's bet amount is encrypted via Arcium MPC and added to the encrypted pool | Nonce fix ensures each ciphertext field uses a unique nonce, preventing plaintext relationship leakage |
| INF-07 | Client-side encryption via @arcium-hq/client (x25519 key exchange, RescueCipher) | Nonce audit across all encrypt callsites; deterministic derivation strategy preserves single-nonce on-chain interface |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @arcium-hq/client | 0.8.5 | RescueCipher encryption, x25519 key exchange, MXE public key fetching | Project's established Arcium SDK version from Phase 3 |
| @coral-xyz/anchor | 0.32.1 | Solana program client, TX building, PDA derivation | Project standard from Phase 1 |
| @tanstack/react-query | (existing) | Mutation hooks, query invalidation, cache management | Project standard for all async state |
| sonner | (existing) | Toast notifications for TX status feedback | Project standard from Phase 7 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @solana/web3.js | (existing) | Connection, PublicKey, SystemProgram, transaction confirmation | PDA derivation, WebSocket subscription |
| bn.js | (existing) | BigNumber for Anchor method arguments | computation_offset, nonce BN conversion |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deterministic nonce derivation (nonce+1) | Two separate random nonces | Would require changing on-chain `place_bet` signature to accept `nonce_1: u128, nonce_2: u128` -- more invasive, IDL regen needed |
| WebSocket subscription for pool init | Polling with setInterval | WebSocket is already the project pattern (useMarket, useUserPosition, useDisputeData); polling would be inconsistent |

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── hooks/
│   ├── useCreateMarket.ts    # NEW: create_market + init_pool chaining
│   └── usePlaceBet.ts        # MODIFIED: (no change if nonce fix is encryption-only)
├── lib/
│   ├── encryption.ts          # FIX: unique nonce per cipher.encrypt call
│   └── pda.ts                 # EXISTING: getMarketPoolPda already available
├── components/
│   └── market/
│       └── BetPlacement.tsx   # MODIFIED: add pool-initializing gate
└── ...
```

### Pattern 1: Multi-TX Hook Chaining (from useOpenDispute)
**What:** A single React hook that chains multiple sequential Solana transactions, with partial-success tracking for retry resilience.
**When to use:** When one user action requires multiple on-chain transactions (create_market -> init_pool).
**Example:**
```typescript
// Reference: useOpenDispute.ts -- proven pattern in this codebase
// Key elements:
// 1. `disputeOpened` state tracks partial success (create_market succeeded)
// 2. On retry, only retries the second TX (init_pool) if first already completed
// 3. Step enum tracks progress for UI: 'idle' | 'creating' | 'initializing' | 'confirming' | 'success' | 'error'
// 4. Toast notifications at each stage transition
```

### Pattern 2: WebSocket-Based Pool Status Detection
**What:** Subscribe to the MarketPool PDA via `connection.onAccountChange` to detect when init_pool callback writes encrypted zeros.
**When to use:** After init_pool TX is confirmed, to detect when MPC callback completes and pool is ready.
**Example:**
```typescript
// Reference: useMarket.ts -- existing WebSocket pattern
// Subscribe to MarketPool PDA account changes
const [poolPda] = getMarketPoolPda(marketId)
const subId = connection.onAccountChange(poolPda, () => {
  queryClient.invalidateQueries({ queryKey: ['marketPool', marketId] })
})
```

### Pattern 3: Arcium Account Derivation (from usePlaceBet/useOpenDispute)
**What:** Dynamic import of `@arcium-hq/client` to derive the 12 Arcium accounts needed for `queue_computation`.
**When to use:** In any hook that queues an MPC computation (useCreateMarket for init_pool).
**Example:**
```typescript
// Reference: usePlaceBet.ts lines 94-131
const { getComputationAccAddress, getClusterAccAddress, getMXEAccAddress, ... } = await import('@arcium-hq/client')
const arciumEnv = getArciumEnv()
const clusterOffset = arciumEnv.arciumClusterOffset
const compDefIndex = Buffer.from(getCompDefAccOffset('init_pool')).readUInt32LE(0)
// ... derive all 12 accounts
```

### Pattern 4: Pool Initialization Detection via Ciphertext Check
**What:** Check if MarketPool `yes_pool_encrypted` and `no_pool_encrypted` are all zeros (uninitialized) vs non-zero (MPC-initialized encrypted zeros).
**When to use:** In BetPlacement to gate the bet form until pool is ready.
**Why it works:** After `create_market`, MarketPool has `[0u8; 32]` for both ciphertext fields. After `init_pool` callback completes, these contain MXE-encrypted representations of zero -- which are non-zero byte arrays. Checking `every(b => b === 0)` reliably distinguishes initialized from uninitialized state.

### Anti-Patterns to Avoid
- **Waiting for MPC callback in the create flow:** The MPC callback takes 2-10s. The hook should fire-and-forget after init_pool TX is confirmed (queue_computation submitted), NOT wait for the callback. The bet panel UI handles the wait.
- **Polling for pool status:** Use WebSocket subscription (project standard), not `setInterval`. Polling is inefficient and inconsistent with the rest of the codebase.
- **Changing place_bet on-chain signature for nonces:** Avoid adding a second nonce parameter to the Anchor instruction if possible. Deterministic derivation (nonce+1) means the ArgBuilder can pass two nonces internally while the instruction only receives one from the user.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Arcium account derivation | Custom PDA derivation for MXE/cluster/mempool | `@arcium-hq/client` helper functions | 12 accounts with complex seeds; proven pattern in usePlaceBet/useOpenDispute |
| Pool initialization detection | Custom RPC polling loop | `connection.onAccountChange` + TanStack Query invalidation | Project's standard real-time update pattern from useMarket/useUserPosition |
| Nonce generation | Custom nonce increment logic | `crypto.getRandomValues` for base + `BigInt(nonce) + 1n` for second | Web Crypto API is the browser-standard CSPRNG; increment is deterministic and auditable |
| Transaction retry with backoff | Custom setTimeout/retry logic | Follow usePlaceBet/useOpenDispute exponential backoff pattern | Proven in production, handles MPC lock contention correctly |

**Key insight:** Every pattern needed for this phase already exists in the codebase. useOpenDispute demonstrates multi-TX chaining with partial-success tracking. usePlaceBet demonstrates Arcium account derivation and encryption. useMarket demonstrates WebSocket-based state detection. The phase is primarily a composition exercise.

## Common Pitfalls

### Pitfall 1: Nonce Derivation Must Match ArgBuilder Expectations
**What goes wrong:** If encryption.ts generates nonce1 for isYes and nonce2 for amount, but ArgBuilder only passes one `plaintext_u128(nonce)`, the MPC nodes will fail to decrypt the second field.
**Why it happens:** The ArgBuilder's `.plaintext_u128(nonce)` sets a single nonce for the entire Enc<Shared, BetInput> struct. The MPC decryption uses this nonce for all fields.
**How to avoid:** The ArgBuilder must pass BOTH nonces. Currently: `.plaintext_u128(nonce)`. After fix: `.plaintext_u128(nonce1).plaintext_u128(nonce2)` -- OR the circuit/ArgBuilder may automatically use sequential nonces internally. This needs verification against the Arcium SDK behavior.
**Warning signs:** MPC computation fails with decryption error on the second field (amount).

**CRITICAL INVESTIGATION NOTE:** Before implementing the nonce fix, verify how ArgBuilder + RescueCipher interact when a struct has multiple fields. The `encrypted-ixs/src/lib.rs` circuit defines `BetInput { is_yes: bool, amount: u64 }` as a single `Enc<Shared, BetInput>`. The ArgBuilder may expect ONE nonce for the whole struct (all fields encrypted under the same nonce), or it may expect sequential nonces per field. The test helper `encryptBetInput` in `tests/mpc/helpers.ts` line 155-156 uses the same nonce for both -- and this WORKS in tests. The nonce reuse issue may be a _theoretical_ concern that doesn't cause MPC failures but does leak plaintext relationships. Resolution approach:
1. Check if Arcium's RescueCipher uses a counter mode internally (nonce reuse with different field indices might be safe)
2. If not, the fix must be coordinated: ArgBuilder must accept per-field nonces AND the circuit must expect them
3. The safest approach: generate a single random nonce, use `nonce` for isYes and `nonce + 1` for amount in `cipher.encrypt()`, then pass both as `plaintext_u128` in ArgBuilder

### Pitfall 2: Race Between create_market and init_pool
**What goes wrong:** If init_pool TX is sent before create_market TX is finalized, the MarketPool PDA doesn't exist yet and init_pool fails.
**Why it happens:** `create_market` creates the MarketPool PDA. `init_pool` reads it. The second TX must wait for the first to land.
**How to avoid:** Wait for `create_market` TX confirmation (`confirmed` commitment) before sending `init_pool` TX. The useOpenDispute pattern (await confirmation of first TX before sending second) handles this correctly.
**Warning signs:** init_pool fails with "Account not found" or "AccountNotInitialized" error.

### Pitfall 3: Config.market_counter Needed for PDA Derivation
**What goes wrong:** After `create_market`, the new market ID is `config.market_counter + 1`. But the hook needs to know this ID to derive `marketPoolPda` for init_pool.
**Why it happens:** The market ID is determined on-chain by incrementing `config.market_counter`. The frontend doesn't know it ahead of time unless it reads Config first.
**How to avoid:** Read Config PDA before sending `create_market` to determine the expected next market ID (`config.market_counter + 1`). Use this to derive all PDAs. The test helper `createTestMarket` in `helpers.ts` takes `expectedMarketId` as a parameter -- same pattern.
**Warning signs:** init_pool sent with wrong MarketPool PDA, fails with seed constraint error.

### Pitfall 4: BetPlacement Gate Must Fetch MarketPool Separately
**What goes wrong:** The `useMarket` hook fetches the Market account, not MarketPool. Checking Market fields won't tell you if the pool ciphertext is initialized.
**Why it happens:** MarketPool is a separate PDA from Market. The zero-check must be on MarketPool's `yes_pool_encrypted` and `no_pool_encrypted` fields.
**How to avoid:** Create a new `useMarketPool` hook (or extend existing hooks) that fetches the MarketPool account and checks for all-zero ciphertext. Subscribe via WebSocket for real-time updates when init_pool callback writes.
**Warning signs:** Bet panel shows "Market initializing..." forever because it's checking the wrong account.

### Pitfall 5: useCastVote Does NOT Have the Nonce Reuse Bug
**What goes wrong:** Over-fixing by changing useCastVote's single-field encryption unnecessarily.
**Why it happens:** `useCastVote` encrypts only ONE field (`VoteInput { is_yes: bool }`) -- there is no second field, so there is no nonce reuse. The bug is specific to `encryptBetForMPC` which encrypts TWO fields (isYes + amount) with the same nonce.
**How to avoid:** Audit confirms useCastVote is safe. Only fix `encryptBetForMPC` in `encryption.ts`.
**Warning signs:** Breaking useCastVote by changing its nonce handling unnecessarily.

## Code Examples

### Example 1: useCreateMarket Hook Structure (based on useOpenDispute pattern)
```typescript
// Based on: useOpenDispute.ts multi-TX chaining pattern
export type CreateMarketStep =
  | 'idle'
  | 'creating'      // Step 1: create_market TX
  | 'initializing'  // Step 2: init_pool TX
  | 'confirming'
  | 'retrying'
  | 'success'
  | 'error'

// Key state: track partial success for retry resilience
const [marketCreated, setMarketCreated] = useState(false)
const [newMarketId, setNewMarketId] = useState<number | null>(null)

// Step 1: Read Config to determine next market ID
const [configPda] = getConfigPda()
const config = await program.account.config.fetch(configPda)
const nextMarketId = (config as any).marketCounter + 1

// Step 2: Send create_market TX
// ... (standard Anchor method call)
setMarketCreated(true)
setNewMarketId(nextMarketId)

// Step 3: Send init_pool TX (same Arcium account derivation as usePlaceBet)
// ... (with 3x retry on failure)
```

### Example 2: Pool Initialization Gate in BetPlacement
```typescript
// In BetPlacement.tsx, add new PanelMode:
type PanelMode = 'pool-initializing' | 'bet' | ... // existing modes

// Check pool state BEFORE existing mode logic
function getBetPanelMode(market, position, walletPubkey, dispute, poolInitialized): PanelMode {
  if (!poolInitialized) return 'pool-initializing'
  // ... existing logic unchanged
}

// Pool initialization check: all-zero ciphertext = uninitialized
function isPoolInitialized(marketPool: { yesPoolEncrypted: number[], noPoolEncrypted: number[] }): boolean {
  return !marketPool.yesPoolEncrypted.every(b => b === 0) ||
         !marketPool.noPoolEncrypted.every(b => b === 0)
}
```

### Example 3: Nonce Fix in encryption.ts (Deterministic Derivation)
```typescript
// BEFORE (nonce reuse -- INT-05 vulnerability):
const nonce = new Uint8Array(16)
crypto.getRandomValues(nonce)
const isYesCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce)
const amountCiphertext = cipher.encrypt([BigInt(amount)], nonce)

// AFTER (unique nonce per field):
const nonce1 = new Uint8Array(16)
crypto.getRandomValues(nonce1)
const isYesCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce1)

// Derive second nonce deterministically: nonce1 + 1 as u128
const nonce2 = new Uint8Array(16)
nonce2.set(nonce1)
// Increment as little-endian u128
let carry = 1
for (let i = 0; i < 16 && carry; i++) {
  const sum = nonce2[i] + carry
  nonce2[i] = sum & 0xff
  carry = sum >> 8
}
const amountCiphertext = cipher.encrypt([BigInt(amount)], nonce2)
```

### Example 4: WebSocket Pool Status Subscription
```typescript
// New hook: useMarketPool.ts (mirrors useMarket.ts pattern)
export function useMarketPool(marketId: number) {
  const program = useReadOnlyProgram()
  const { connection } = useConnection()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['marketPool', marketId],
    queryFn: async () => {
      const [poolPda] = getMarketPoolPda(marketId)
      return await program.account.marketPool.fetch(poolPda)
    },
  })

  useEffect(() => {
    const [poolPda] = getMarketPoolPda(marketId)
    const subId = connection.onAccountChange(poolPda, () => {
      queryClient.invalidateQueries({ queryKey: ['marketPool', marketId] })
    })
    return () => connection.removeAccountChangeListener(subId)
  }, [connection, marketId, queryClient])

  return query
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual init_pool after create_market (test-only) | Auto-chained in useCreateMarket hook | Phase 12 | No manual step needed; pool ready before first bet |
| Same nonce for all cipher.encrypt calls | Unique nonce per ciphertext field | Phase 12 | Eliminates XOR-based plaintext relationship leakage |

**Deprecated/outdated:**
- The standalone `update_pool` instruction (in `mpc/update_pool.rs`) is superseded by `place_bet` for production use but retained for Phase 3 test compatibility. Phase 12 does not need to modify it.

## Open Questions

1. **ArgBuilder multi-field nonce semantics**
   - What we know: The ArgBuilder takes `.plaintext_u128(nonce)` once, then `.encrypted_bool()` and `.encrypted_u64()`. Tests work with same nonce for both fields. The circuit defines `Enc<Shared, BetInput>` as a single encrypted struct.
   - What's unclear: Does Arcium's RescueCipher internally use counter mode (making same-nonce different-field safe)? Or does it use the nonce directly as an IV (making same-nonce a real vulnerability)?
   - Recommendation: **Test-first approach.** Change encryption.ts to use nonce+1 for the second field, add a second `.plaintext_u128(nonce2)` to the ArgBuilder call in `place_bet.rs`, rebuild and test. If MPC decryption fails, revert to single nonce with a code comment documenting the tradeoff. If it succeeds, the fix is complete. The on-chain change is minimal (one additional parameter).

2. **On-chain signature change for dual nonces**
   - What we know: `place_bet` currently takes `nonce: u128`. Adding `nonce_amount: u128` changes the IDL and requires IDL regen.
   - What's unclear: Whether the ArgBuilder's `.plaintext_u128()` can be called twice to pass separate nonces for separate encrypted fields within one `Enc<Shared, BetInput>`.
   - Recommendation: Try `.plaintext_u128(nonce1).plaintext_u128(nonce2)` first. If ArgBuilder rejects multiple plaintext_u128 calls, fall back to a single nonce with documented tradeoff.

3. **Timeout duration for recovery button**
   - What we know: MPC latency is estimated 2-10s. init_pool is a simple computation (encrypt two zeros).
   - What's unclear: Actual init_pool MPC latency on devnet (DKG blocker prevents measurement).
   - Recommendation: Use 30s as the timeout (matches CONTEXT.md suggestion). This is 3x the worst-case estimated MPC latency, providing generous margin while still feeling responsive.

## Sources

### Primary (HIGH confidence)
- **Project codebase** - Direct source code analysis of:
  - `encryption.ts` -- nonce reuse confirmed at lines 53-54
  - `place_bet.rs` -- ArgBuilder nonce handling, single `plaintext_u128(nonce)`
  - `encrypted-ixs/src/lib.rs` -- BetInput struct definition, update_pool circuit
  - `init_pool.rs` / `init_pool_callback.rs` -- complete on-chain init_pool instruction
  - `create_market.rs` -- MarketPool PDA creation with zero-filled ciphertext
  - `useOpenDispute.ts` -- multi-TX chaining pattern with partial-success tracking
  - `usePlaceBet.ts` -- Arcium account derivation pattern for frontend hooks
  - `useMarket.ts` -- WebSocket subscription pattern for real-time PDA updates
  - `BetPlacement.tsx` -- getBetPanelMode state machine, PanelMode types
  - `tests/mpc/helpers.ts` -- encryptBetInput confirming nonce reuse in test code

### Secondary (MEDIUM confidence)
- **CONTEXT.md decisions** -- User-specified implementation approach for init_pool chaining and nonce fix
- **STATE.md** -- Historical decisions on Arcium SDK version (0.8.5), ArgBuilder patterns, exponential backoff retry

### Tertiary (LOW confidence)
- **RescueCipher nonce semantics** -- Based on stream cipher security properties (training knowledge). The specific behavior of Arcium's RescueCipher with repeated nonces has NOT been verified against official documentation. The nonce reuse concern is real for any non-counter-mode stream cipher, but Arcium may have internal protections. Flagged in Open Questions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in the project
- Architecture: HIGH - Every pattern needed exists in the codebase (useOpenDispute, usePlaceBet, useMarket)
- Pitfalls: HIGH for frontend patterns, MEDIUM for ArgBuilder nonce semantics (needs testing)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- no external dependencies changing)
