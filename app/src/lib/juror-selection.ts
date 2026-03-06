/**
 * Deterministic juror selection algorithms matching on-chain Rust implementations.
 *
 * selectJurors  -- mirrors open_dispute.rs Fisher-Yates partial shuffle
 * selectTiebreakerJuror -- mirrors add_tiebreaker.rs sequential scan
 *
 * Both use the same LCG constants and u64 wrapping semantics as the Rust code
 * so the client can predict the exact juror ordering before TX submission.
 */

import type { PublicKey } from "@solana/web3.js";

/** Mask to simulate Rust u64 wrapping arithmetic in BigInt */
const U64_MAX = (1n << 64n) - 1n;

/** LCG multiplier used in both on-chain instructions */
const LCG_MULTIPLIER = 6364136223846793005n;

/** Default juror count matching on-chain JUROR_COUNT constant */
const JUROR_COUNT = 7;

/**
 * Replicate the on-chain Fisher-Yates partial shuffle from open_dispute.rs.
 *
 * On-chain seed: `market.id` (u64)
 * LCG step: `seed.wrapping_add(i).wrapping_mul(LCG).wrapping_add(1) % remaining`
 * Selection: `available.remove(idx)` -- splice semantics (not swap)
 */
export function selectJurors(
  marketId: number,
  resolverPubkeys: PublicKey[],
  count: number = JUROR_COUNT
): PublicKey[] {
  const seed = BigInt(marketId);
  const available = resolverPubkeys.map((_, i) => i);
  const selectedIndices: number[] = [];

  for (let i = 0; i < count; i++) {
    const remaining = BigInt(available.length);
    // Must match: seed.wrapping_add(i as u64).wrapping_mul(LCG).wrapping_add(1) % remaining
    const hash = ((((seed + BigInt(i)) & U64_MAX) * LCG_MULTIPLIER + 1n) & U64_MAX);
    const idx = Number(hash % remaining);
    selectedIndices.push(available.splice(idx, 1)[0]);
  }

  return selectedIndices.map((idx) => resolverPubkeys[idx]);
}

/**
 * Replicate the on-chain tiebreaker selection from add_tiebreaker.rs.
 *
 * On-chain seed: `market_id.wrapping_mul(LCG) ^ (vote_count as u64)`
 * Scan: sequential `(seed + i) % registry_len`, first non-juror wins
 */
export function selectTiebreakerJuror(
  marketId: number,
  voteCount: number,
  resolverPubkeys: PublicKey[],
  currentJurors: PublicKey[]
): PublicKey | null {
  const seed = ((BigInt(marketId) * LCG_MULTIPLIER) & U64_MAX) ^ BigInt(voteCount);
  const registryLen = BigInt(resolverPubkeys.length);
  if (registryLen === 0n) return null;

  const currentJurorKeys = new Set(currentJurors.map((j) => j.toBase58()));

  for (let i = 0n; i < registryLen; i++) {
    const candidateIdx = Number(((seed + i) & U64_MAX) % registryLen);
    const candidate = resolverPubkeys[candidateIdx];
    if (!currentJurorKeys.has(candidate.toBase58())) {
      return candidate;
    }
  }

  return null;
}
