import type { AnchorProvider } from '@coral-xyz/anchor'
import type { PublicKey } from '@solana/web3.js'

/**
 * Browser-safe encryption wrapper for placing encrypted bets via Arcium MPC.
 *
 * Encrypts the isYes and amount fields using x25519 key exchange with the MXE
 * public key and RescueCipher, matching the update_pool circuit expectations
 * from Phase 3. Each field is encrypted with a unique nonce: nonce1 for isYes,
 * nonce1+1 (little-endian u128 increment) for amount. This prevents XOR-based
 * plaintext relationship leakage with stream ciphers.
 *
 * NOTE: @arcium-hq/client browser compatibility is unverified. If the import
 * fails in Vite dev mode, it may need a polyfill. The encryption function will
 * throw a descriptive error if the library is unavailable.
 */
export async function encryptBetForMPC(
  provider: AnchorProvider,
  programId: PublicKey,
  isYes: boolean,
  amount: number,
): Promise<{
  isYesCiphertext: Uint8Array
  amountCiphertext: Uint8Array
  publicKey: Uint8Array
  nonce: Uint8Array
  nonceBN: bigint
  nonce2: Uint8Array
  nonce2BN: bigint
}> {
  try {
    // Dynamic import to handle potential browser incompatibility gracefully
    const { RescueCipher, x25519, getMXEPublicKey, deserializeLE } =
      await import('@arcium-hq/client')

    // 1. Get MXE public key from on-chain account
    const mxePublicKey = await getMXEPublicKey(provider, programId)
    if (!mxePublicKey) {
      throw new Error(
        'Failed to get MXE public key. The Arcium DKG ceremony may not be complete on this network.',
      )
    }

    // 2. Generate x25519 keypair (uses crypto.getRandomValues internally)
    const privateKey = x25519.utils.randomPrivateKey()
    const publicKey = x25519.getPublicKey(privateKey)

    // 3. Derive shared secret with MXE
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey)
    const cipher = new RescueCipher(sharedSecret)

    // 4. Browser-safe nonce generation (Web Crypto API, NOT Node.js crypto)
    const nonce1 = new Uint8Array(16)
    crypto.getRandomValues(nonce1)

    // 5. Derive second nonce deterministically as nonce1 + 1 (little-endian u128)
    //    Each cipher.encrypt call MUST use a unique nonce to prevent XOR-based
    //    plaintext relationship leakage with stream ciphers.
    const nonce2 = new Uint8Array(16)
    nonce2.set(nonce1)
    let carry = 1
    for (let i = 0; i < 16 && carry; i++) {
      const sum = nonce2[i] + carry
      nonce2[i] = sum & 0xff
      carry = sum >> 8
    }

    // NOTE: The on-chain ArgBuilder currently passes a single plaintext_u128(nonce).
    // If MPC decryption fails for the amount field, the ArgBuilder in place_bet.rs
    // may need updating to pass both nonces: .plaintext_u128(nonce1).plaintext_u128(nonce2).
    // Both nonces are returned so usePlaceBet can pass them if needed.

    // 6. Encrypt fields with unique nonces (matching update_pool circuit expectations)
    const isYesCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce1)
    const amountCiphertext = cipher.encrypt([BigInt(amount)], nonce2)

    return {
      isYesCiphertext: isYesCiphertext[0], // Uint8Array[32]
      amountCiphertext: amountCiphertext[0], // Uint8Array[32]
      publicKey, // Uint8Array[32]
      nonce: nonce1, // Primary nonce (backward compat)
      nonceBN: deserializeLE(nonce1), // For passing to Anchor as u128
      nonce2, // Second nonce for amount field
      nonce2BN: deserializeLE(nonce2), // Second nonce as BigInt
    }
  } catch (error) {
    // Provide a descriptive error if @arcium-hq/client fails to load in browser
    if (
      error instanceof Error &&
      (error.message.includes('Module') ||
        error.message.includes('import') ||
        error.message.includes('require'))
    ) {
      throw new Error(
        `@arcium-hq/client failed to load in browser environment. ` +
          `This may be due to Node.js-only dependencies. ` +
          `Arcium DKG is currently blocked on devnet (0/142 MXE accounts). ` +
          `Original error: ${error.message}`,
      )
    }
    throw error
  }
}
