import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const DEFAULT_ARCIUM_PROGRAM_ID = new PublicKey(
  "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
);

const SEEDS = {
  clock: "ClockAccount",
  feePool: "FeePool",
  computation: "ComputationAccount",
  mempool: "Mempool",
  execPool: "Execpool",
  cluster: "Cluster",
  mxeAccount: "MXEAccount",
  compDef: "ComputationDefinitionAccount",
} as const;

const COMP_DEF_OFFSETS_U32: Record<string, number> = {
  hello_world: 439093045,
  init_pool: 2287228373,
  update_pool: 3319405198,
  compute_payouts: 1409338781,
  init_dispute_tally: 2037286833,
  add_dispute_vote: 3205181369,
  finalize_dispute: 1478025627,
};

function u32LeBuffer(value: number) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

function getClusterOffset(): number {
  const raw = import.meta.env.VITE_ARCIUM_CLUSTER_OFFSET ?? "0";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `Invalid VITE_ARCIUM_CLUSTER_OFFSET: ${raw} (expected non-negative number)`
    );
  }
  // Arcium offset is a u32 on-chain.
  return parsed >>> 0;
}

export function getArciumProgramId(): PublicKey {
  const raw = import.meta.env.VITE_ARCIUM_PROGRAM_ID;
  if (!raw) return DEFAULT_ARCIUM_PROGRAM_ID;
  return new PublicKey(raw);
}

export function getArciumClusterOffset(): number {
  return getClusterOffset();
}

export function getCompDefOffsetU32(circuitName: string): number {
  const offset = COMP_DEF_OFFSETS_U32[circuitName];
  if (offset === undefined) {
    throw new Error(`Unknown circuit name: ${circuitName}`);
  }
  return offset >>> 0;
}

function findArciumPda(seeds: Array<Buffer | Uint8Array>) {
  return PublicKey.findProgramAddressSync(seeds, getArciumProgramId())[0];
}

export function getMXEAccountAddress(mxeProgramId: PublicKey): PublicKey {
  return findArciumPda([
    Buffer.from(SEEDS.mxeAccount),
    mxeProgramId.toBuffer(),
  ]);
}

export function getClusterAccountAddress(
  clusterOffset = getClusterOffset()
): PublicKey {
  return findArciumPda([
    Buffer.from(SEEDS.cluster),
    u32LeBuffer(clusterOffset),
  ]);
}

export function getMempoolAccountAddress(
  clusterOffset = getClusterOffset()
): PublicKey {
  return findArciumPda([
    Buffer.from(SEEDS.mempool),
    u32LeBuffer(clusterOffset),
  ]);
}

export function getExecutingPoolAddress(
  clusterOffset = getClusterOffset()
): PublicKey {
  return findArciumPda([
    Buffer.from(SEEDS.execPool),
    u32LeBuffer(clusterOffset),
  ]);
}

export function getFeePoolAddress(): PublicKey {
  return findArciumPda([Buffer.from(SEEDS.feePool)]);
}

export function getClockAddress(): PublicKey {
  return findArciumPda([Buffer.from(SEEDS.clock)]);
}

export function getComputationAccountAddress(
  computationOffset: BN,
  clusterOffset = getClusterOffset()
): PublicKey {
  const offsetBuf = u32LeBuffer(clusterOffset);
  const compOffsetBuf = computationOffset.toArrayLike(Buffer, "le", 8);
  return findArciumPda([
    Buffer.from(SEEDS.computation),
    offsetBuf,
    compOffsetBuf,
  ]);
}

export function getComputationDefinitionAddress(
  mxeProgramId: PublicKey,
  circuitName: string
): PublicKey {
  const offsetU32 = getCompDefOffsetU32(circuitName);
  return findArciumPda([
    Buffer.from(SEEDS.compDef),
    mxeProgramId.toBuffer(),
    u32LeBuffer(offsetU32),
  ]);
}
