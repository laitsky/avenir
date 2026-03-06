/**
 * Shared browser-side Arcium encryption helper.
 *
 * This module is the single encryption boundary for bet and vote flows.
 * All encryption happens in the browser -- no plaintext crosses the
 * browser/server boundary.
 *
 * Uses @arcium-hq/client directly in the browser bundle (polyfilled via
 * vite.config.ts aliasing Node crypto to crypto-browserify).
 */

import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { createReadonlyAnchorProvider } from "#/lib/anchor";

// ---- Internal helpers ----

/**
 * Fetches the MXE public key from on-chain state, creates a fresh x25519
 * key pair, derives the shared secret, and returns a ready-to-use
 * RescueCipher plus the user's ephemeral public key.
 */
async function prepareEncryptionContext(
  connection: Connection,
  programId: PublicKey
) {
  const { RescueCipher, x25519, getMXEPublicKey } = await import(
    "@arcium-hq/client"
  );

  const provider = createReadonlyAnchorProvider(connection);

  const mxePublicKey = await getMXEPublicKey(provider, programId);
  if (!mxePublicKey) {
    throw new Error(
      "Failed to get MXE public key. The Arcium DKG ceremony may not be complete on this network."
    );
  }

  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  return { cipher, publicKey };
}

// ---- Public API ----

export interface EncryptedBetResult {
  isYesCiphertext: number[];
  amountCiphertext: number[];
  publicKey: number[];
  nonce: number[];
  nonceBN: string;
}

/**
 * Encrypts a bet payload in the browser for submission to the place_bet
 * instruction.
 *
 * Uses a single `cipher.encrypt([isYes, amount], nonce)` call so both
 * ciphertext fields are produced under distinct counter blocks from the
 * same nonce. This matches the on-chain one-nonce ArgBuilder contract.
 */
export async function encryptBetForMpcClient(
  connection: Connection,
  programId: PublicKey,
  isYes: boolean,
  amountLamports: number
): Promise<EncryptedBetResult> {
  const { deserializeLE } = await import("@arcium-hq/client");
  const { cipher, publicKey } = await prepareEncryptionContext(
    connection,
    programId
  );

  const nonce = crypto.getRandomValues(new Uint8Array(16));

  // One combined encrypt call -- produces two ciphertext field elements
  // under distinct CTR counter blocks from the same nonce, avoiding the
  // counter-reuse bug of the previous split-call approach.
  const [isYesCiphertext, amountCiphertext] = cipher.encrypt(
    [BigInt(isYes ? 1 : 0), BigInt(amountLamports)],
    nonce
  );

  const nonceBN = deserializeLE(nonce);

  return {
    isYesCiphertext: Array.from(isYesCiphertext),
    amountCiphertext: Array.from(amountCiphertext),
    publicKey: Array.from(publicKey),
    nonce: Array.from(nonce),
    nonceBN: nonceBN.toString(),
  };
}
