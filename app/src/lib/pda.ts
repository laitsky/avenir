import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "#/lib/constants";

/**
 * Encodes a market ID as an 8-byte little-endian buffer for PDA seed derivation.
 * Matches the on-chain `market_id.to_le_bytes()` encoding.
 */
function marketIdBuffer(id: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(id));
  return buf;
}

/**
 * Derives the Market PDA.
 * Seeds: [b"market", market_id.to_le_bytes()]
 */
export function getMarketPda(
  id: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdBuffer(id)],
    programId
  );
}

/**
 * Derives the MarketPool PDA.
 * Seeds: [b"market_pool", market_id.to_le_bytes()]
 */
export function getMarketPoolPda(
  id: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market_pool"), marketIdBuffer(id)],
    programId
  );
}

/**
 * Derives the Vault PDA (token account authority).
 * Seeds: [b"vault", market_id.to_le_bytes()]
 */
export function getVaultPda(
  id: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketIdBuffer(id)],
    programId
  );
}

/**
 * Derives the UserPosition PDA.
 * Seeds: [b"position", market_id.to_le_bytes(), user.key()]
 */
export function getPositionPda(
  marketId: number,
  user: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketIdBuffer(marketId), user.toBuffer()],
    programId
  );
}

/**
 * Derives the Config PDA.
 * Seeds: [b"config"]
 */
export function getConfigPda(
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

/**
 * Derives the Dispute PDA.
 * Seeds: [b"dispute", market_id.to_le_bytes()]
 */
export function getDisputePda(
  marketId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dispute"), marketIdBuffer(marketId)],
    programId
  );
}

/**
 * Derives the DisputeTally PDA.
 * Seeds: [b"dispute_tally", market_id.to_le_bytes()]
 */
export function getDisputeTallyPda(
  marketId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dispute_tally"), marketIdBuffer(marketId)],
    programId
  );
}

/**
 * Derives the Resolver PDA for a given wallet.
 * Seeds: [b"resolver", wallet.key()]
 */
export function getResolverPda(
  wallet: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("resolver"), wallet.toBuffer()],
    programId
  );
}

/**
 * Derives the ResolverRegistry PDA.
 * Seeds: [b"resolver_registry"]
 */
export function getResolverRegistryPda(
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("resolver_registry")],
    programId
  );
}
