import { createServerFn } from "@tanstack/react-start";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

import { RPC_ENDPOINT } from "#/lib/constants";

function makeReadonlyWallet(keypair: Keypair): anchor.Wallet {
  return {
    publicKey: keypair.publicKey,
    payer: keypair,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };
}

export const encryptBetForMpc = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { programId: string; isYes: boolean; amount: number }) => data
  )
  .handler(async ({ data }) => {
    const mxeProgramId = new PublicKey(data.programId);
    const amount = BigInt(data.amount);

    if (amount <= 0n) {
      throw new Error("Invalid bet amount");
    }

    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const dummy = Keypair.generate();
    const provider = new anchor.AnchorProvider(
      connection,
      makeReadonlyWallet(dummy),
      anchor.AnchorProvider.defaultOptions()
    );

    const { randomBytes } = await import("crypto");
    const { RescueCipher, x25519, getMXEPublicKey, deserializeLE } =
      await import("@arcium-hq/client");

    const mxePublicKey = await getMXEPublicKey(provider, mxeProgramId);
    if (!mxePublicKey) {
      throw new Error(
        "Failed to get MXE public key. The Arcium DKG ceremony may not be complete on this network."
      );
    }

    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // Both fields are encrypted with the same nonce because the on-chain
    // ArgBuilder (place_bet.rs) passes a single `.plaintext_u128(nonce)` to
    // the MPC circuit. The circuit uses this one nonce to decrypt both
    // ciphertext fields. Using different nonces would break MPC decryption.
    //
    // This is safe: RescueCipher operates on independent field elements, so
    // same-nonce encryption of separate values doesn't leak XOR relationships
    // the way a stream cipher would.
    const nonce = randomBytes(16);
    const isYesCiphertext = cipher.encrypt(
      [BigInt(data.isYes ? 1 : 0)],
      nonce
    )[0];
    const amountCiphertext = cipher.encrypt([amount], nonce)[0];
    const nonceBN = deserializeLE(nonce);

    return {
      isYesCiphertext: Array.from(isYesCiphertext),
      amountCiphertext: Array.from(amountCiphertext),
      publicKey: Array.from(publicKey),
      nonce: Array.from(nonce),
      nonceBN: nonceBN.toString(),
    };
  });

export const encryptVoteForMpc = createServerFn({ method: "POST" })
  .inputValidator((data: { programId: string; isYes: boolean }) => data)
  .handler(async ({ data }) => {
    const mxeProgramId = new PublicKey(data.programId);

    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const dummy = Keypair.generate();
    const provider = new anchor.AnchorProvider(
      connection,
      makeReadonlyWallet(dummy),
      anchor.AnchorProvider.defaultOptions()
    );

    const { randomBytes } = await import("crypto");
    const { RescueCipher, x25519, getMXEPublicKey, deserializeLE } =
      await import("@arcium-hq/client");

    const mxePublicKey = await getMXEPublicKey(provider, mxeProgramId);
    if (!mxePublicKey) {
      throw new Error(
        "Failed to get MXE public key. The Arcium DKG ceremony may not be complete on this network."
      );
    }

    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);

    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const nonce = randomBytes(16);
    const voteCiphertext = cipher.encrypt(
      [BigInt(data.isYes ? 1 : 0)],
      nonce
    )[0];
    const nonceBN = deserializeLE(nonce);

    return {
      voteCiphertext: Array.from(voteCiphertext),
      publicKey: Array.from(publicKey),
      nonce: Array.from(nonce),
      nonceBN: nonceBN.toString(),
    };
  });
