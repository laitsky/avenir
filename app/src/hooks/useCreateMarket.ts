import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import BN from 'bn.js'
import { toast } from 'sonner'
import { useAnchorProgram } from '#/lib/anchor'
import { PROGRAM_ID, USDC_MINT } from '#/lib/constants'
import {
  getMarketPda,
  getMarketPoolPda,
  getVaultPda,
  getConfigPda,
} from '#/lib/pda'

export type CreateMarketStep =
  | 'idle'
  | 'creating' // Step 1: create_market TX
  | 'initializing' // Step 2: init_pool TX
  | 'confirming'
  | 'retrying'
  | 'success'
  | 'error'

export interface CreateMarketInput {
  question: string
  resolutionSource: string
  category: number
  resolutionTime: number
}

const MAX_INIT_RETRIES = 3
const BASE_DELAY_MS = 2000

/**
 * Handles the full market creation flow:
 * 1. Submit create_market TX
 * 2. Auto-chain init_pool TX for MPC encrypted pool initialization
 *
 * If create_market succeeds but init_pool fails, retry only retries
 * the init_pool step (market already exists on-chain).
 *
 * Fire-and-forget: resolves after init_pool TX is confirmed on-chain,
 * does NOT wait for MPC callback to complete.
 */
export function useCreateMarket() {
  const program = useAnchorProgram()
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<CreateMarketStep>('idle')
  const [retryCount, setRetryCount] = useState(0)
  const [marketCreated, setMarketCreated] = useState(false)
  const [newMarketId, setNewMarketId] = useState<number | null>(null)

  const mutation = useMutation({
    mutationFn: async (input: CreateMarketInput) => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      let nextMarketId = newMarketId

      // Step 1: Create market (skip if already created on retry)
      if (!marketCreated) {
        setStep('creating')

        // Read Config PDA to determine next market ID
        const [configPda] = getConfigPda()
        const config = await program.account.config.fetch(configPda)
        nextMarketId = (config as any).marketCounter + 1
        setNewMarketId(nextMarketId)

        // Derive PDAs for the new market
        const [marketPda] = getMarketPda(nextMarketId)
        const [marketPoolPda] = getMarketPoolPda(nextMarketId)
        const [marketVaultPda] = getVaultPda(nextMarketId)

        // Derive creator whitelist PDA: seeds = ["whitelist", creator_pubkey]
        const [whitelistPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('whitelist'), publicKey.toBuffer()],
          PROGRAM_ID,
        )

        const createSig = await program.methods
          .createMarket({
            question: input.question,
            resolutionSource: input.resolutionSource,
            category: input.category,
            resolutionTime: new BN(input.resolutionTime),
          })
          .accounts({
            creator: publicKey,
            config: configPda,
            whitelist: whitelistPda,
            market: marketPda,
            marketVault: marketVaultPda,
            marketPool: marketPoolPda,
            usdcMint: USDC_MINT,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' })

        await connection.confirmTransaction(createSig, 'confirmed')
        setMarketCreated(true)

        toast.success('Market created -- initializing pool...', {
          action: {
            label: 'View',
            onClick: () =>
              window.open(
                `https://solscan.io/tx/${createSig}?cluster=devnet`,
                '_blank',
              ),
          },
        })
      }

      // Step 2: Auto-chain init_pool
      if (nextMarketId === null) {
        throw new Error('Market ID not available')
      }

      setStep('initializing')

      const [marketPoolPda] = getMarketPoolPda(nextMarketId)
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
        getCompDefAccOffset('init_pool'),
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

      // Retry init_pool up to MAX_INIT_RETRIES times
      let lastError: unknown = null
      for (let attempt = 0; attempt <= MAX_INIT_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            setStep('retrying')
            setRetryCount(attempt)
            // Exponential backoff: 2s, 4s, 8s
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
            await new Promise((resolve) => setTimeout(resolve, delay))
            setStep('initializing')
          }

          const initSig = await program.methods
            .initPool(computationOffset)
            .accounts({
              payer: publicKey,
              marketPool: marketPoolPda,
              systemProgram: SystemProgram.programId,
              ...arciumAccounts,
            })
            .rpc({ commitment: 'confirmed' })

          // Step 3: Confirm
          setStep('confirming')
          await connection.confirmTransaction(initSig, 'confirmed')

          setStep('success')
          return { initSig, marketId: nextMarketId }
        } catch (err) {
          lastError = err
          if (attempt >= MAX_INIT_RETRIES) break
        }
      }

      // All retries exhausted
      throw lastError
    },
    onSuccess: ({ initSig, marketId }) => {
      queryClient.invalidateQueries({ queryKey: ['markets'] })

      toast.success(`Market #${marketId} created and pool initialized`, {
        action: {
          label: 'View',
          onClick: () =>
            window.open(
              `https://solscan.io/tx/${initSig}?cluster=devnet`,
              '_blank',
            ),
        },
      })

      // Reset after a brief delay so UI shows success state
      setTimeout(() => {
        setStep('idle')
        setRetryCount(0)
        setMarketCreated(false)
        setNewMarketId(null)
      }, 1500)
    },
    onError: (error) => {
      setStep('error')
      const errorMsg = error instanceof Error ? error.message : String(error)

      if (marketCreated) {
        // create_market succeeded but init_pool failed after retries
        toast.error(
          'Market created but pool initialization failed. Retry?',
          {
            action: {
              label: 'Retry',
              onClick: () => {
                setStep('idle')
                setRetryCount(0)
                mutation.mutate(mutation.variables!)
              },
            },
            duration: 10000,
          },
        )
      } else {
        toast.error(errorMsg || 'Failed to create market')
      }
    },
  })

  return {
    ...mutation,
    step,
    retryCount,
    newMarketId,
    reset: () => {
      setStep('idle')
      setRetryCount(0)
      setMarketCreated(false)
      setNewMarketId(null)
      mutation.reset()
    },
  }
}
