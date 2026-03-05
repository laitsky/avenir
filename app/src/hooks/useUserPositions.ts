import { useQuery } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { useReadOnlyProgram } from '#/lib/anchor'
import { mapPositionAccount, mapMarketAccount } from '#/lib/types'
import type { OnChainPosition, OnChainMarket } from '#/lib/types'

export interface EnrichedPosition {
  position: OnChainPosition
  market: OnChainMarket | null
}

/**
 * Fetches ALL UserPosition accounts for the connected wallet and enriches
 * each position with its corresponding market data.
 *
 * Uses a memcmp filter on the user pubkey to fetch only the connected wallet's
 * positions server-side. The UserPosition account layout is:
 *   - discriminator: 8 bytes
 *   - market_id (i64): 8 bytes
 *   - user (Pubkey): starts at offset 16
 *
 * Auto-polls every 20s to match useMarkets polling cadence.
 * Disabled when wallet is disconnected (no publicKey).
 */
export function useUserPositions() {
  const { publicKey } = useWallet()
  const program = useReadOnlyProgram()

  return useQuery<EnrichedPosition[]>({
    queryKey: ['positions', publicKey?.toBase58()],
    enabled: !!publicKey,
    refetchInterval: 20_000,
    queryFn: async () => {
      // Fetch all UserPosition accounts filtered by user pubkey using memcmp.
      // Offset derivation: discriminator (8 bytes) + market_id (i64, 8 bytes) = 16 bytes.
      // The user Pubkey field starts at byte offset 16.
      let mappedPositions: OnChainPosition[]
      try {
        const positions = await program.account.userPosition.all([
          {
            memcmp: {
              offset: 16, // discriminator (8) + market_id (8)
              bytes: publicKey!.toBase58(),
            },
          },
        ])
        mappedPositions = positions.map((a) =>
          mapPositionAccount(a.publicKey, a.account as any),
        )
      } catch {
        // Fallback: fetch all and filter client-side if memcmp offset is wrong
        const allPositions = await program.account.userPosition.all()
        mappedPositions = allPositions
          .map((a) => mapPositionAccount(a.publicKey, a.account as any))
          .filter((p) => p.user.equals(publicKey!))
      }

      // Fetch all markets to enrich positions with market data
      const markets = await program.account.market.all()
      const marketMap = new Map(
        markets.map((m) => {
          const mapped = mapMarketAccount(m.publicKey, m.account as any)
          return [mapped.id, mapped]
        }),
      )

      // Join positions with their corresponding market data
      return mappedPositions.map((pos) => ({
        position: pos,
        market: marketMap.get(pos.marketId) ?? null,
      }))
    },
  })
}
