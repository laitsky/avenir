import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { useReadOnlyProgram } from '#/lib/anchor'
import { getMarketPoolPda } from '#/lib/pda'

/**
 * Checks if a MarketPool has been initialized by the MPC callback.
 *
 * After create_market, the pool has all-zero ciphertext fields.
 * After init_pool callback completes, these contain MXE-encrypted
 * representations of zero -- which are non-zero byte arrays.
 */
export function isPoolInitialized(pool: {
  yesPoolEncrypted: number[]
  noPoolEncrypted: number[]
}): boolean {
  return (
    !pool.yesPoolEncrypted.every((b: number) => b === 0) ||
    !pool.noPoolEncrypted.every((b: number) => b === 0)
  )
}

/**
 * Fetches a MarketPool account by market ID with WebSocket subscription
 * for real-time pool initialization detection.
 *
 * Uses useReadOnlyProgram so pool data loads without a connected wallet.
 * Subscribes to on-chain account changes via connection.onAccountChange,
 * invalidating the query when the MarketPool PDA is modified (e.g. by
 * init_pool callback writing encrypted zeros).
 */
export function useMarketPool(marketId: number) {
  const program = useReadOnlyProgram()
  const { connection } = useConnection()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['marketPool', marketId],
    queryFn: async () => {
      const [poolPda] = getMarketPoolPda(marketId)
      return await program.account.marketPool.fetch(poolPda)
    },
    enabled: marketId >= 0,
  })

  // WebSocket subscription for real-time updates (detects init_pool callback)
  useEffect(() => {
    const [poolPda] = getMarketPoolPda(marketId)
    const subId = connection.onAccountChange(poolPda, () => {
      queryClient.invalidateQueries({ queryKey: ['marketPool', marketId] })
    })
    return () => {
      connection.removeAccountChangeListener(subId)
    }
  }, [connection, marketId, queryClient])

  const poolInitialized = query.data
    ? isPoolInitialized(query.data as any)
    : false

  return {
    ...query,
    poolInitialized,
  }
}
