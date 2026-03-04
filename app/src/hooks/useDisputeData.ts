import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { useReadOnlyProgram } from '#/lib/anchor'
import { getDisputePda } from '#/lib/pda'
import { mapDisputeAccount } from '#/lib/types'

/**
 * Fetches the Dispute PDA for a given market ID with websocket subscription.
 *
 * Returns null if no dispute exists for this market (account not found).
 * Uses useReadOnlyProgram so dispute data loads without a connected wallet.
 * Subscribes to on-chain account changes for real-time dispute updates.
 */
export function useDisputeData(marketId: number) {
  const program = useReadOnlyProgram()
  const { connection } = useConnection()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['dispute', marketId],
    queryFn: async () => {
      const [disputePda] = getDisputePda(marketId)
      try {
        const account = await program.account.dispute.fetch(disputePda)
        return mapDisputeAccount(disputePda, account as any)
      } catch {
        // Dispute account doesn't exist (market hasn't been disputed)
        return null
      }
    },
    enabled: marketId >= 0,
  })

  // Websocket subscription for real-time dispute updates
  useEffect(() => {
    const [disputePda] = getDisputePda(marketId)
    const subId = connection.onAccountChange(disputePda, () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', marketId] })
    })
    return () => {
      connection.removeAccountChangeListener(subId)
    }
  }, [connection, marketId, queryClient])

  return {
    dispute: query.data ?? null,
    loading: query.isLoading,
    refetch: query.refetch,
  }
}
