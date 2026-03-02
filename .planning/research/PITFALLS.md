# Pitfalls Research: Avenir (Confidential Prediction Markets)

**Researched:** 2026-03-02
**Domain:** Prediction Markets + Arcium MPC on Solana

## Critical Pitfalls

### 1. MPC Circuit Design — Both Branches Execute

**Risk:** HIGH
**Phase:** On-chain + Arcium integration

In Arcis, conditionals on secret data execute BOTH branches. Cost = sum of all branches. A naive `if is_yes { update_yes_pool } else { update_no_pool }` costs 2x what you'd expect.

**Warning signs:** Circuit computation costs double expected. Gas/CU estimates blow up.

**Prevention:**
- Use branchless arithmetic: `yes_pool += amount * is_yes; no_pool += amount * (1 - is_yes)` where `is_yes` is 0 or 1
- Profile circuit costs early with minimal test circuits
- Budget MPC computation costs into protocol fee model

### 2. MPC Circuit Design — No Dynamic Data Structures

**Risk:** HIGH
**Phase:** On-chain + Arcium integration

Arcis doesn't support `Vec`, `String`, or dynamic allocation. All data must be fixed-size `[T; N]` arrays. This means you can't have "unlimited bets per market" inside a single circuit invocation.

**Warning signs:** Compilation failures. Attempts to accumulate variable-length bet arrays.

**Prevention:**
- Design circuits to process ONE bet at a time (accumulate into encrypted pool state)
- Store encrypted pool state on-chain as fixed-size ciphertext, pass as input to each computation
- Don't try to batch variable numbers of bets in a single circuit call

### 3. Concurrency — Async MPC Callbacks Create Race Conditions

**Risk:** HIGH
**Phase:** On-chain + Arcium integration

MPC computation is async (estimated 2-10s). Two simultaneous bets read the same encrypted pool state, both submit MPC computations, and the second callback overwrites the first's result. Lost bets.

**Warning signs:** Bets disappearing under load. Pool totals not matching sum of individual bets.

**Prevention:**
- V1: Sequential lock — reject new bets while a computation is pending (set a `processing` flag on the market account)
- Refund USDC if bet submission is rejected due to lock
- V2: Batch epoch processing — collect bets for N seconds, process as a batch
- Test with concurrent bet submissions early

### 4. Encrypted State Relay — Unvalidated Core Assumption

**Risk:** HIGH
**Phase:** On-chain + Arcium integration

The architecture assumes `Enc<Mxe, T>` ciphertext can be stored in a Solana account, then read back and passed into a subsequent MPC computation. This is the core pattern but no reference implementation exists for prediction markets.

**Warning signs:** Ciphertext deserialization failures. MPC computation rejects stored ciphertext as input.

**Prevention:**
- Build a minimal proof-of-concept FIRST: store encrypted counter, increment it via MPC, read it back
- This is Phase 1 priority — validate before any feature work
- Have a fallback: if relay doesn't work, explore alternative state management

### 5. Parimutuel Math — Division and Rounding

**Risk:** MEDIUM
**Phase:** On-chain program

Payout calculation: `user_payout = (user_bet / winning_pool) * total_pool`. Division in MPC is very expensive. Rounding errors can leave dust in the pool or overdraw it.

**Warning signs:** Pool doesn't zero out after all claims. Last claimant gets less than expected. Integer overflow on large pools.

**Prevention:**
- Do division in PLAINTEXT after resolution reveals pool totals — no need for encrypted division
- Use `u64` math with USDC's 6 decimals (multiply before divide to preserve precision)
- Calculate payouts as: `payout = (user_bet * total_pool) / winning_pool`
- Handle dust: last claimant gets remaining balance, not calculated amount
- Test with edge cases: 1 bet on each side, all bets on one side, minimum bets

### 6. USDC Decimal Handling

**Risk:** MEDIUM
**Phase:** On-chain program

USDC on Solana uses 6 decimals. 1 USDC = 1,000,000 token units. Mixing up decimals means $1 bets become $0.000001 bets or $1,000,000 bets.

**Warning signs:** Amounts look wrong in UI. Payout math is off by orders of magnitude.

**Prevention:**
- Define a constant: `USDC_DECIMALS = 6`, `ONE_USDC = 1_000_000`
- Minimum bet: `1_000_000` (= $1 USDC)
- All on-chain math uses raw token units, all UI display divides by 10^6
- Never pass floating-point amounts to on-chain program

### 7. Dispute Resolution — Sybil and Collusion Attacks

**Risk:** MEDIUM
**Phase:** Dispute mechanism

If resolver pool is small, a determined attacker could register multiple resolvers and control dispute outcomes. Even with encrypted votes, if one entity controls majority of resolvers, they decide outcomes.

**Warning signs:** Resolver pool dominated by few addresses. Disputes always resolving one way.

**Prevention:**
- Minimum resolver pool size before disputes can proceed (e.g., 5 resolvers)
- Require meaningful USDC stake from resolvers (high enough to deter Sybil)
- Slash resolvers who vote against the majority outcome
- Random resolver selection from pool (not all resolvers vote on every dispute)
- Track resolver accuracy over time

### 8. MPC Callback Failure — Bet Funds in Limbo

**Risk:** MEDIUM
**Phase:** On-chain + Arcium integration

User submits bet → USDC transferred to escrow → MPC computation queued → callback fails. User's USDC is locked but bet wasn't recorded in encrypted pool.

**Warning signs:** Users report "missing" funds. Escrow balance exceeds pool accounting.

**Prevention:**
- Two-phase bet: (1) escrow USDC + record pending bet, (2) MPC callback confirms and updates pool
- If callback fails, user can reclaim from pending bet escrow
- Timeout mechanism: if callback doesn't arrive within N slots, bet is refundable
- Never assume MPC callback will succeed

### 9. Sentiment Bucket Information Leakage

**Risk:** LOW-MEDIUM
**Phase:** Arcium integration

Sentiment buckets ("Leaning Yes / Even / Leaning No") computed via MPC. If updated after every bet, an observer can deduce individual bet direction by watching bucket transitions.

**Warning signs:** Sentiment flips after a single large bet, revealing that bet's direction.

**Prevention:**
- Update sentiment less frequently (every N bets, or every M minutes)
- Use wide buckets with hysteresis (don't flip from "Even" to "Leaning Yes" on small changes)
- Threshold: only update if sentiment genuinely shifted (e.g., ratio changed by >5%)
- Consider batching sentiment updates

### 10. RTG Submission — Clarity and Documentation

**Risk:** MEDIUM
**Phase:** Final submission

RTG judges on Innovation, Technical Implementation, UX, Impact, AND Clarity. Many technically strong submissions fail on clarity — judges don't understand why Arcium was needed or how it was used.

**Warning signs:** No clear documentation of Arcium's role. Privacy benefits not demonstrated visually.

**Prevention:**
- README must explicitly explain: (1) what's encrypted, (2) why encryption matters for prediction markets, (3) how Arcium enables it
- Include architecture diagram showing encrypted vs. plaintext data flow
- The fog UI is a huge asset — it SHOWS privacy visually (demo value)
- Record a demo video walking through the encrypted betting + resolution flow
- Compare with Polymarket: "on Polymarket, whales see your bet and front-run; on Avenir, the fog protects you"

### 11. Solana Account Size Limits

**Risk:** LOW
**Phase:** On-chain program

Solana accounts have a 10MB limit. Encrypted ciphertext is larger than plaintext. If market accounts store many encrypted fields, account size could become an issue.

**Warning signs:** Account allocation failures. Rent costs unexpectedly high.

**Prevention:**
- Estimate ciphertext sizes early (Arcium encrypted values are significantly larger than plaintext)
- Keep market accounts minimal: only pool state + metadata
- Store individual bet records in separate PDA accounts (per-user-per-market)
- Calculate rent costs and factor into market creation fee

### 12. Wallet Adapter SSR Hydration Mismatch

**Risk:** LOW
**Phase:** Frontend

TanStack Start does SSR. Solana wallet adapters are client-only. If not handled, SSR renders "not connected" state, client hydrates with "connected" state → React hydration error.

**Warning signs:** Flash of "Connect Wallet" on page load even when connected. Console hydration warnings.

**Prevention:**
- Wrap wallet-dependent UI in client-only boundaries
- Use `useEffect` or TanStack's client-only patterns for wallet state
- Test SSR behavior with wallet connected early in frontend development

## Pitfall Priority by Phase

| Phase | Critical Pitfalls |
|-------|-------------------|
| Environment + POC | #4 (encrypted state relay), #1 (both branches), #2 (fixed-size data) |
| On-chain Program | #5 (parimutuel math), #6 (USDC decimals), #11 (account sizes), #8 (callback failure) |
| Arcium Integration | #3 (concurrency), #9 (sentiment leakage), #1 (circuit optimization) |
| Dispute System | #7 (Sybil/collusion), #8 (callback failure) |
| Frontend | #12 (SSR hydration) |
| Submission | #10 (RTG clarity) |

---
*Researched: 2026-03-02*
