import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import BN from 'bn.js'
import { toast } from 'sonner'
import { useAnchorProgram } from '#/lib/anchor'
import { PROGRAM_ID } from '#/lib/constants'
import { getMarketPda, getDisputePda, getDisputeTallyPda, getResolverPda } from '#/lib/pda'

/**
 * Hook for submitting encrypted juror votes on active disputes.
 *
 * Encrypts the vote boolean using @arcium-hq/client (mirroring usePlaceBet pattern),
 * builds and sends the cast_vote transaction with all required PDA accounts.
 *
 * Returns { castVote, loading, error } for the JurorVotePanel UI.
 */
export function useCastVote(marketId: number) {
  const program = useAnchorProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function castVote(isYes: boolean): Promise<void> {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Encrypt the vote boolean using Arcium client
      const {
        RescueCipher,
        x25519,
        getMXEPublicKey,
        deserializeLE,
        getComputationAccAddress,
        getClusterAccAddress,
        getMXEAccAddress,
        getMempoolAccAddress,
        getExecutingPoolAccAddress,
        getCompDefAccAddress,
        getCompDefAccOffset,
        getArciumEnv,
        getFeePoolAccAddress,
        getClockAccAddress,
        getArciumProgramId,
      } = await import('@arcium-hq/client')

      // Generate encryption keypair
      const privateKey = x25519.utils.randomPrivateKey()
      const pubKey = x25519.getPublicKey(privateKey)

      // Get MXE public key and derive shared secret
      const mxePublicKey = await getMXEPublicKey(
        program.provider as any,
        PROGRAM_ID,
      )
      if (!mxePublicKey) {
        throw new Error(
          'Failed to get MXE public key. DKG ceremony may not be complete.',
        )
      }

      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey)
      const cipher = new RescueCipher(sharedSecret)

      // Browser-safe nonce
      const nonce = new Uint8Array(16)
      crypto.getRandomValues(nonce)

      // Encrypt vote boolean (1 = Yes, 0 = No)
      const voteCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce)
      const nonceBN = deserializeLE(nonce)

      // 2. Derive all PDAs
      const [marketPda] = getMarketPda(marketId)
      const [disputePda] = getDisputePda(marketId)
      const [disputeTallyPda] = getDisputeTallyPda(marketId)
      const [resolverPda] = getResolverPda(publicKey)

      // Random computation offset
      const computationOffset = new BN(
        crypto.getRandomValues(new Uint8Array(8)),
      )

      // 3. Arcium account derivation
      const arciumEnv = getArciumEnv()
      const clusterOffset = arciumEnv.arciumClusterOffset
      const compDefIndex = Buffer.from(
        getCompDefAccOffset('add_dispute_vote'),
      ).readUInt32LE(0)

      const arciumAccounts = {
        mxeAccount: getMXEAccAddress(PROGRAM_ID),
        signPdaAccount: PublicKey.findProgramAddressSync(
          [Buffer.from('ArciumSignerAccount')],
          PROGRAM_ID,
        )[0],
        mempoolAccount: getMempoolAccAddress(clusterOffset),
        executingPool: getExecutingPoolAccAddress(clusterOffset),
        computationAccount: getComputationAccAddress(
          clusterOffset,
          computationOffset,
        ),
        compDefAccount: getCompDefAccAddress(PROGRAM_ID, compDefIndex),
        clusterAccount: getClusterAccAddress(clusterOffset),
        poolAccount: getFeePoolAccAddress(),
        clockAccount: getClockAccAddress(),
        arciumProgram: getArciumProgramId(),
      }

      // 4. Submit cast_vote transaction
      const sig = await program.methods
        .castVote(
          computationOffset,
          Array.from(voteCiphertext[0]) as any,
          Array.from(pubKey) as any,
          new BN(nonceBN.toString()),
        )
        .accounts({
          juror: publicKey,
          dispute: disputePda,
          disputeTally: disputeTallyPda,
          market: marketPda,
          resolver: resolverPda,
          systemProgram: SystemProgram.programId,
          ...arciumAccounts,
        })
        .rpc({ commitment: 'confirmed' })

      // 5. Invalidate queries for real-time update
      queryClient.invalidateQueries({ queryKey: ['dispute', marketId] })
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })

      toast.success(`Vote submitted: ${isYes ? 'Yes' : 'No'}`, {
        action: {
          label: 'View',
          onClick: () =>
            window.open(
              `https://solscan.io/tx/${sig}?cluster=devnet`,
              '_blank',
            ),
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error(`Failed to submit vote: ${msg}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { castVote, loading, error }
}
