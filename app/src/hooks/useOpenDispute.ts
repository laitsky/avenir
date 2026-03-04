import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import BN from 'bn.js'
import { toast } from 'sonner'
import { useAnchorProgram, useReadOnlyProgram } from '#/lib/anchor'
import { PROGRAM_ID } from '#/lib/constants'
import {
  getMarketPda,
  getPositionPda,
  getResolverRegistryPda,
  getDisputePda,
  getDisputeTallyPda,
  getResolverPda,
} from '#/lib/pda'

export type EscalateStep =
  | 'idle'
  | 'checking' // Pre-checking resolver count
  | 'escalating' // Step 1/2: open_dispute TX
  | 'initializing' // Step 2/2: init_dispute_tally TX
  | 'confirming'
  | 'retrying'
  | 'success'
  | 'error'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 2000

/**
 * Handles the full dispute escalation flow:
 * 1. Pre-check resolver count (>= 7 required)
 * 2. Submit open_dispute TX with resolver remaining_accounts
 * 3. Auto-chain init_dispute_tally TX for MPC encrypted vote state
 *
 * If open_dispute succeeds but init_dispute_tally fails, retry only retries
 * the init_dispute_tally step (dispute already exists on-chain).
 *
 * Implements exponential backoff retry for MPC lock contention.
 */
export function useOpenDispute(marketId: number) {
  const program = useAnchorProgram()
  const readOnlyProgram = useReadOnlyProgram()
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<EscalateStep>('idle')
  const [retryCount, setRetryCount] = useState(0)
  const [resolverCount, setResolverCount] = useState<number | null>(null)
  const [disputeOpened, setDisputeOpened] = useState(false)

  // Fetch resolver count on mount for pre-check
  useEffect(() => {
    async function fetchResolverCount() {
      try {
        const [registryPda] = getResolverRegistryPda()
        const registry =
          await readOnlyProgram.account.resolverRegistry.fetch(registryPda)
        setResolverCount((registry as any).resolvers.length)
      } catch {
        // Registry may not exist yet
        setResolverCount(0)
      }
    }
    fetchResolverCount()
  }, [readOnlyProgram])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      // Step 1: Pre-check resolver count
      setStep('checking')
      const [registryPda] = getResolverRegistryPda()
      const registry =
        await program.account.resolverRegistry.fetch(registryPda)
      const resolvers: PublicKey[] = (registry as any).resolvers
      if (resolvers.length < 7) {
        throw new Error(
          `Not enough resolvers available (${resolvers.length}/7 required)`,
        )
      }

      // Derive all PDAs
      const [marketPda] = getMarketPda(marketId)
      const [positionPda] = getPositionPda(marketId, publicKey)
      const [disputePda] = getDisputePda(marketId)
      const [disputeTallyPda] = getDisputeTallyPda(marketId)

      // Build remaining_accounts: each resolver's Resolver PDA
      const resolverAccounts = resolvers.map((resolverPubkey) => ({
        pubkey: getResolverPda(resolverPubkey)[0],
        isSigner: false,
        isWritable: true,
      }))

      // Step 2: Submit open_dispute TX
      if (!disputeOpened) {
        setStep('escalating')
        const openSig = await program.methods
          .openDispute()
          .accounts({
            escalator: publicKey,
            market: marketPda,
            userPosition: positionPda,
            resolverRegistry: registryPda,
            dispute: disputePda,
            disputeTally: disputeTallyPda,
            systemProgram: SystemProgram.programId,
          })
          .remainingAccounts(resolverAccounts)
          .rpc({ commitment: 'confirmed' })

        await connection.confirmTransaction(openSig, 'confirmed')
        setDisputeOpened(true)

        toast.success('Dispute opened -- initializing vote tally...', {
          action: {
            label: 'View',
            onClick: () =>
              window.open(
                `https://solscan.io/tx/${openSig}?cluster=devnet`,
                '_blank',
              ),
          },
        })
      }

      // Step 3: Auto-chain init_dispute_tally
      setStep('initializing')

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
        getCompDefAccOffset('init_dispute_tally'),
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

      const initSig = await program.methods
        .initDisputeTally(computationOffset)
        .accounts({
          payer: publicKey,
          dispute: disputePda,
          disputeTally: disputeTallyPda,
          systemProgram: SystemProgram.programId,
          ...arciumAccounts,
        })
        .rpc({ commitment: 'confirmed' })

      // Step 4: Confirm and invalidate
      setStep('confirming')
      await connection.confirmTransaction(initSig, 'confirmed')

      setStep('success')
      return { initSig }
    },
    onSuccess: ({ initSig }) => {
      queryClient.invalidateQueries({ queryKey: ['dispute', marketId] })
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })

      toast.success('Dispute escalated -- jury voting will begin shortly', {
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
        setDisputeOpened(false)
      }, 1500)
    },
    onError: async (error, _variables, _context) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const isLockError =
        errorMsg.includes('MpcLocked') ||
        errorMsg.includes('mpc_lock') ||
        errorMsg.includes('DisputeBusy')

      if (isLockError && retryCount < MAX_RETRIES) {
        setStep('retrying')
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)

        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = BASE_DELAY_MS * Math.pow(2, newRetryCount - 1)
        toast.info(
          `Dispute busy -- retrying... (attempt ${newRetryCount})`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))

        queryClient.invalidateQueries({ queryKey: ['dispute', marketId] })
        mutation.mutate()
        return
      }

      setStep('error')

      if (disputeOpened) {
        // open_dispute succeeded but init_dispute_tally failed
        toast.error(
          'Dispute opened -- initializing vote tally failed. Retry?',
          {
            action: {
              label: 'Retry',
              onClick: () => {
                setStep('idle')
                setRetryCount(0)
                mutation.mutate()
              },
            },
            duration: 10000,
          },
        )
      } else if (isLockError) {
        toast.error('Dispute is busy. Please try again in a moment.', {
          action: {
            label: 'Retry',
            onClick: () => {
              setStep('idle')
              setRetryCount(0)
              mutation.mutate()
            },
          },
        })
      } else {
        toast.error(errorMsg || 'Failed to escalate dispute')
      }
    },
  })

  return {
    ...mutation,
    step,
    retryCount,
    resolverCount,
    reset: () => {
      setStep('idle')
      setRetryCount(0)
      setDisputeOpened(false)
      mutation.reset()
    },
  }
}
