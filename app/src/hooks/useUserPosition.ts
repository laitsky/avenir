import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useReadOnlyProgram } from '#/lib/anchor'
import { getPositionPda } from '#/lib/pda'
import { mapPositionAccount } from '#/lib/types'

/**
 * Fetches the current user's position for a specific market.
 *
 * Returns null if the user has no position (account doesn't exist).
 * Only fetches when wallet is connected (enabled: !!publicKey).
 * Includes websocket subscription for real-time updates when bet callback completes.
 */
export function useUserPosition(marketId: number) {
  const program = useReadOnlyProgram()
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['position', marketId, publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return null
      const [positionPda] = getPositionPda(marketId, publicKey)
      try {
        const account = await program.account.userPosition.fetch(positionPda)
        return mapPositionAccount(positionPda, account as any)
      } catch {
        // Position account doesn't exist yet (user hasn't bet on this market)
        return null
      }
    },
    enabled: !!publicKey,
  })

  // Websocket subscription on position PDA for real-time updates
  useEffect(() => {
    if (!publicKey) return
    const [positionPda] = getPositionPda(marketId, publicKey)
    const subId = connection.onAccountChange(positionPda, () => {
      queryClient.invalidateQueries({
        queryKey: ['position', marketId, publicKey.toBase58()],
      })
    })
    return () => {
      connection.removeAccountChangeListener(subId)
    }
  }, [connection, marketId, publicKey, queryClient])

  return query
}
