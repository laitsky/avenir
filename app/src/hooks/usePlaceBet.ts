import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import BN from 'bn.js'
import { toast } from 'sonner'
import { useAnchorProgram } from '#/lib/anchor'
import { PROGRAM_ID, USDC_MINT } from '#/lib/constants'
import { encryptBetForMPC } from '#/lib/encryption'
import {
  getMarketPda,
  getMarketPoolPda,
  getVaultPda,
  getPositionPda,
  getConfigPda,
} from '#/lib/pda'

export type BetStep =
  | 'idle'
  | 'encrypting'
  | 'submitting'
  | 'confirming'
  | 'retrying'
  | 'success'
  | 'error'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 2000

/**
 * Handles the full bet placement flow: encrypt -> submit -> confirm.
 *
 * Tracks step state for UI progress indicators.
 * Implements exponential backoff retry for MPC lock contention.
 * Shows toast notifications on success/failure per CONTEXT.md.
 */
export function usePlaceBet(marketId: number) {
  const program = useAnchorProgram()
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<BetStep>('idle')
  const [retryCount, setRetryCount] = useState(0)

  const mutation = useMutation({
    mutationFn: async ({
      amount,
      isYes,
    }: {
      amount: number
      isYes: boolean
    }) => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      // Step 1: Encrypt
      setStep('encrypting')
      const amountLamports = amount * 1_000_000 // USDC has 6 decimals
      const encrypted = await encryptBetForMPC(
        program.provider as any,
        PROGRAM_ID,
        isYes,
        amountLamports,
      )

      // Step 2: Submit
      setStep('submitting')

      // Derive all PDAs
      const [marketPda] = getMarketPda(marketId)
      const [marketPoolPda] = getMarketPoolPda(marketId)
      const [vaultPda] = getVaultPda(marketId)
      const [positionPda] = getPositionPda(marketId, publicKey)
      const [configPda] = getConfigPda()

      // User's USDC associated token account
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey,
      )

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
        getCompDefAccOffset('update_pool'),
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
        .placeBet(
          new BN(amountLamports),
          isYes,
          computationOffset,
          Array.from(encrypted.isYesCiphertext) as any,
          Array.from(encrypted.amountCiphertext) as any,
          Array.from(encrypted.publicKey) as any,
          new BN(encrypted.nonceBN.toString()),
        )
        .accounts({
          bettor: publicKey,
          market: marketPda,
          marketPool: marketPoolPda,
          userPosition: positionPda,
          userTokenAccount,
          marketVault: vaultPda,
          pendingBettorTokenAccount: userTokenAccount,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          ...arciumAccounts,
        })
        .rpc({ commitment: 'confirmed' })

      // Step 3: Confirm
      setStep('confirming')
      await connection.confirmTransaction(sig, 'confirmed')

      setStep('success')
      return { sig, amount, isYes }
    },
    onSuccess: ({ sig, amount, isYes }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
      queryClient.invalidateQueries({ queryKey: ['position', marketId] })

      toast.success(
        `Bet placed: ${amount} USDC on ${isYes ? 'Yes' : 'No'}`,
        {
          action: {
            label: 'View',
            onClick: () =>
              window.open(
                `https://solscan.io/tx/${sig}?cluster=devnet`,
                '_blank',
              ),
          },
        },
      )

      // Reset after a brief delay so UI shows success state
      setTimeout(() => {
        setStep('idle')
        setRetryCount(0)
      }, 1500)
    },
    onError: async (error, variables) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const isLockError =
        errorMsg.includes('MarketLocked') ||
        errorMsg.includes('MpcLocked') ||
        errorMsg.includes('mpc_lock')

      if (isLockError && retryCount < MAX_RETRIES) {
        setStep('retrying')
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)

        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = BASE_DELAY_MS * Math.pow(2, newRetryCount - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Re-fetch market to check if lock cleared
        queryClient.invalidateQueries({ queryKey: ['market', marketId] })

        // Retry the mutation
        mutation.mutate(variables)
        return
      }

      setStep('error')
      if (isLockError) {
        toast.error('Market is busy. Please try again in a moment.', {
          action: {
            label: 'Retry',
            onClick: () => {
              setStep('idle')
              setRetryCount(0)
              mutation.mutate(variables)
            },
          },
        })
      } else {
        toast.error(errorMsg || 'Failed to place bet')
      }
    },
  })

  return {
    ...mutation,
    step,
    retryCount,
    reset: () => {
      setStep('idle')
      setRetryCount(0)
      mutation.reset()
    },
  }
}
