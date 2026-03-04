import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import BN from 'bn.js'
import { toast } from 'sonner'
import { useAnchorProgram } from '#/lib/anchor'
import { PROGRAM_ID } from '#/lib/constants'
import { getMarketPda, getDisputePda, getDisputeTallyPda } from '#/lib/pda'

/**
 * Submits the permissionless finalize_dispute queue instruction.
 *
 * Any wallet can trigger this after dispute quorum is reached.
 * Queues an MPC computation that decrypts and reveals the dispute vote totals,
 * enabling the callback to determine the jury verdict.
 *
 * Mirrors the useComputePayouts pattern -- same permissionless MPC queue flow.
 */
export function useFinalizeDispute(marketId: number) {
  const program = useAnchorProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      const [marketPda] = getMarketPda(marketId)
      const [disputePda] = getDisputePda(marketId)
      const [disputeTallyPda] = getDisputeTallyPda(marketId)

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
        getCompDefAccOffset('finalize_dispute'),
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
        .finalizeDispute(computationOffset)
        .accounts({
          payer: publicKey,
          dispute: disputePda,
          disputeTally: disputeTallyPda,
          market: marketPda,
          systemProgram: SystemProgram.programId,
          ...arciumAccounts,
        })
        .rpc({ commitment: 'confirmed' })

      return sig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', marketId] })
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
      toast.success('Revealing outcome -- fog clearing!')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error)
      const isLockError =
        msg.includes('MpcLocked') || msg.includes('mpc_lock')

      if (isLockError) {
        toast.error('Dispute busy -- try again in a moment', {
          action: {
            label: 'Retry',
            onClick: () => {
              /* caller can re-invoke mutate() */
            },
          },
        })
      } else {
        toast.error(`Failed to reveal outcome: ${msg}`)
      }
    },
  })
}
