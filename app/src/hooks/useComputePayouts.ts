import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import BN from 'bn.js'
import { toast } from 'sonner'
import { useAnchorProgram } from '#/lib/anchor'
import { PROGRAM_ID } from '#/lib/constants'
import { getMarketPda, getMarketPoolPda } from '#/lib/pda'

/**
 * Submits the permissionless compute_payouts queue instruction.
 *
 * Any wallet can trigger this after the market creator has resolved.
 * Queues an MPC computation that decrypts and reveals the pool totals.
 */
export function useComputePayouts(marketId: number) {
  const program = useAnchorProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      const [marketPda] = getMarketPda(marketId)
      const [marketPoolPda] = getMarketPoolPda(marketId)

      // Random computation offset
      const computationOffset = new BN(
        crypto.getRandomValues(new Uint8Array(8)),
      )

      // Arcium account derivation (dynamic import for browser safety)
      const {
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

      const arciumEnv = getArciumEnv()
      const clusterOffset = arciumEnv.arciumClusterOffset
      const compDefIndex = Buffer.from(
        getCompDefAccOffset('compute_payouts'),
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

      const sig = await program.methods
        .computePayouts(computationOffset)
        .accounts({
          payer: publicKey,
          market: marketPda,
          marketPool: marketPoolPda,
          systemProgram: SystemProgram.programId,
          ...arciumAccounts,
        })
        .rpc({ commitment: 'confirmed' })

      return sig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
      toast.success('Payouts revealed -- fog clearing!')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to compute payouts: ${msg}`)
    },
  })
}
