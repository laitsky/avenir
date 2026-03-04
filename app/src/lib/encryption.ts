import type { AnchorProvider } from '@coral-xyz/anchor'
import type { PublicKey } from '@solana/web3.js'

/**
 * Browser-safe encryption wrapper for placing encrypted bets via Arcium MPC.
 *
 * Encrypts the isYes and amount fields separately using x25519 key exchange
 * with the MXE public key and RescueCipher, matching the update_pool circuit
 * expectations from Phase 3.
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
    const nonce = new Uint8Array(16)
    crypto.getRandomValues(nonce)

    // 5. Encrypt fields separately (matching update_pool circuit expectations)
    const isYesCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce)
    const amountCiphertext = cipher.encrypt([BigInt(amount)], nonce)

    return {
      isYesCiphertext: isYesCiphertext[0], // Uint8Array[32]
      amountCiphertext: amountCiphertext[0], // Uint8Array[32]
      publicKey, // Uint8Array[32]
      nonce,
      nonceBN: deserializeLE(nonce), // For passing to Anchor as u128
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
