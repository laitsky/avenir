import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'
import { useAnchorProgram, useReadOnlyProgram } from '#/lib/anchor'
import {
  getDisputePda,
  getMarketPda,
  getResolverRegistryPda,
  getResolverPda,
} from '#/lib/pda'

/**
 * Submits the add_tiebreaker instruction for tie scenarios.
 *
 * This is a plain Anchor instruction (NOT an MPC queue instruction).
 * Any wallet can trigger it when a dispute has been reset to Voting after a tie.
 *
 * The on-chain code uses clock.slot + LCG for deterministic juror selection,
 * which the client cannot predict. The client passes a candidate Resolver PDA
 * as remaining_accounts. If the slot-based selection doesn't match, the TX
 * will fail and the user can retry (different slot = different selection).
 */
export function useAddTiebreaker(marketId: number) {
  const program = useAnchorProgram()
  const readOnlyProgram = useReadOnlyProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      const [disputePda] = getDisputePda(marketId)
      const [marketPda] = getMarketPda(marketId)
      const [resolverRegistryPda] = getResolverRegistryPda()

      // Fetch registry to get resolver list
      const registry = await readOnlyProgram.account.resolverRegistry.fetch(
        resolverRegistryPda,
      )
      const resolvers: PublicKey[] = (registry as any).resolvers

      // Fetch dispute to get current jurors
      const dispute = await readOnlyProgram.account.dispute.fetch(disputePda)
      const currentJurors: PublicKey[] = (dispute as any).jurors
      const currentJurorKeys = new Set(currentJurors.map((j) => j.toBase58()))

      // Find non-juror candidates from registry
      const candidates = resolvers.filter(
        (r) => !currentJurorKeys.has(r.toBase58()),
      )

      if (candidates.length === 0) {
        throw new Error('No eligible resolver candidates for tiebreaker')
      }

      // Build remaining_accounts with the first candidate resolver PDA.
      // If only 1 candidate, it's guaranteed to match on-chain selection.
      // If multiple, the TX may fail due to slot mismatch -- user can retry.
      const candidateResolverPda = getResolverPda(candidates[0])[0]

      const sig = await program.methods
        .addTiebreaker()
        .accounts({
          payer: publicKey,
          dispute: disputePda,
          market: marketPda,
          resolverRegistry: resolverRegistryPda,
        })
        .remainingAccounts([
          {
            pubkey: candidateResolverPda,
            isSigner: false,
            isWritable: true,
          },
        ])
        .rpc({ commitment: 'confirmed' })

      return sig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', marketId] })
      toast.success('Tiebreaker juror added -- voting extended 24h')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to add tiebreaker: ${msg}`, {
        action: {
          label: 'Retry',
          onClick: () => {
            /* caller can re-invoke mutate() */
          },
        },
      })
    },
  })
}
