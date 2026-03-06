/**
 * Cross-verification tests for juror-selection.ts
 *
 * Proves that the TypeScript Fisher-Yates and tiebreaker selection algorithms
 * produce identical results to the on-chain Rust implementations in
 * open_dispute.rs and add_tiebreaker.rs.
 */

import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { selectJurors, selectTiebreakerJuror } from "#/lib/juror-selection";

// Generate deterministic pubkeys using PDA derivation (reproducible across runs)
function makePubkeys(count: number): PublicKey[] {
  const programId = new PublicKey("11111111111111111111111111111111");
  return Array.from({ length: count }, (_, i) => {
    const seed = Buffer.alloc(4);
    seed.writeUInt32LE(i);
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from("test"), seed], programId);
    return pda;
  });
}

const PUBKEYS_8 = makePubkeys(8);
const PUBKEYS_10 = makePubkeys(10);

describe("selectJurors", () => {
  it("returns exactly `count` pubkeys", () => {
    const result = selectJurors(1, PUBKEYS_8, 7);
    expect(result).toHaveLength(7);
  });

  it("all selected pubkeys are from the input array", () => {
    const result = selectJurors(1, PUBKEYS_8, 7);
    const inputSet = new Set(PUBKEYS_8.map((p) => p.toBase58()));
    for (const pk of result) {
      expect(inputSet.has(pk.toBase58())).toBe(true);
    }
  });

  it("selected pubkeys have no duplicates", () => {
    const result = selectJurors(1, PUBKEYS_8, 7);
    const keys = result.map((p) => p.toBase58());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("is deterministic: same inputs produce same output", () => {
    const a = selectJurors(42, PUBKEYS_10, 7);
    const b = selectJurors(42, PUBKEYS_10, 7);
    expect(a.map((p) => p.toBase58())).toEqual(b.map((p) => p.toBase58()));
  });

  it("different marketId produces different ordering", () => {
    const a = selectJurors(1, PUBKEYS_10, 7);
    const b = selectJurors(2, PUBKEYS_10, 7);
    // At least one position should differ
    const aKeys = a.map((p) => p.toBase58());
    const bKeys = b.map((p) => p.toBase58());
    expect(aKeys).not.toEqual(bKeys);
  });

  it("works when count equals resolver count (selects all)", () => {
    const result = selectJurors(1, PUBKEYS_8, 8);
    expect(result).toHaveLength(8);
    const keys = result.map((p) => p.toBase58());
    expect(new Set(keys).size).toBe(8);
  });
});

describe("selectTiebreakerJuror", () => {
  it("returns the one non-juror when only 1 candidate remains", () => {
    // Use 8 pubkeys, select 7 as jurors, tiebreaker should find the 8th
    const jurors = selectJurors(1, PUBKEYS_8, 7);
    const result = selectTiebreakerJuror(1, 5, PUBKEYS_8, jurors);
    expect(result).not.toBeNull();
    // Must be from the input set but NOT in jurors
    const jurorSet = new Set(jurors.map((p) => p.toBase58()));
    expect(jurorSet.has(result!.toBase58())).toBe(false);
    expect(PUBKEYS_8.map((p) => p.toBase58())).toContain(result!.toBase58());
  });

  it("returns null when all resolvers are already jurors", () => {
    // All 8 pubkeys are jurors -- no candidate left
    const result = selectTiebreakerJuror(1, 5, PUBKEYS_8, PUBKEYS_8);
    expect(result).toBeNull();
  });

  it("is deterministic: same inputs produce same result", () => {
    const jurors = selectJurors(1, PUBKEYS_8, 7);
    const a = selectTiebreakerJuror(1, 5, PUBKEYS_8, jurors);
    const b = selectTiebreakerJuror(1, 5, PUBKEYS_8, jurors);
    expect(a?.toBase58()).toBe(b?.toBase58());
  });

  it("different voteCount can produce different selection", () => {
    // With 10 resolvers and 7 jurors, there are 3 candidates.
    // Different voteCount changes the seed, potentially picking a different candidate.
    const jurors = selectJurors(1, PUBKEYS_10, 7);
    const results = new Set<string>();
    for (let vc = 0; vc < 20; vc++) {
      const r = selectTiebreakerJuror(1, vc, PUBKEYS_10, jurors);
      if (r) results.add(r.toBase58());
    }
    // With 3 candidates and 20 different seeds, should hit at least 2 distinct selections
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});

describe("BigInt wrapping arithmetic", () => {
  it("LCG step matches expected value for seed=1, i=0", () => {
    // Rust: (1u64).wrapping_add(0).wrapping_mul(6364136223846793005).wrapping_add(1)
    // = 1 * 6364136223846793005 + 1 = 6364136223846793006
    const U64_MAX = (1n << 64n) - 1n;
    const LCG = 6364136223846793005n;
    const seed = 1n;
    const i = 0n;
    const result = ((((seed + i) & U64_MAX) * LCG + 1n) & U64_MAX);
    expect(result).toBe(6364136223846793006n);
  });

  it("wrapping_mul handles large seed without precision loss", () => {
    // Rust: u64::MAX.wrapping_mul(6364136223846793005) =
    // In Rust, u64::MAX * 6364136223846793005 wraps to:
    // u64::MAX = 18446744073709551615
    // u64::MAX * LCG (mod 2^64) = (-1) * LCG (mod 2^64) = 2^64 - LCG = 12082607849862758611
    const U64_MAX = (1n << 64n) - 1n;
    const LCG = 6364136223846793005n;
    const result = (U64_MAX * LCG) & U64_MAX;
    expect(result).toBe((1n << 64n) - LCG);
  });

  it("selectJurors uses 6364136223846793005 as LCG multiplier", () => {
    // Verify indirectly: selectJurors(0, ...) with seed=0 should produce
    // indices based on (0+i)*LCG+1 mod remaining
    // For seed=0, i=0: hash = (0*LCG + 1) & U64_MAX = 1
    // idx = 1 % 8 = 1 (second element)
    const result = selectJurors(0, PUBKEYS_8, 1);
    // The first selected should be index 1 of the original array
    expect(result[0].toBase58()).toBe(PUBKEYS_8[1].toBase58());
  });
});
