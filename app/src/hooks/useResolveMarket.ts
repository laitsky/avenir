import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { useAnchorProgram } from '#/lib/anchor'
import { getMarketPda } from '#/lib/pda'

/**
 * Submits a resolveMarket instruction for market creators.
 *
 * Only the market creator can resolve after the deadline passes.
 * winningOutcome: 1 = Yes, 2 = No
 */
export function useResolveMarket(marketId: number) {
  const program = useAnchorProgram()
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (winningOutcome: number) => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected')
      }

      const [marketPda] = getMarketPda(marketId)

      const sig = await program.methods
        .resolveMarket(winningOutcome)
        .accounts({
          creator: publicKey,
          market: marketPda,
        })
        .rpc({ commitment: 'confirmed' })

      return sig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
      toast.success('Market resolved')
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to resolve market: ${msg}`)
    },
  })
}
