import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { useReadOnlyProgram } from "#/lib/anchor";
import { getMarketPda } from "#/lib/pda";
import { mapMarketAccount } from "#/lib/types";

/**
 * Fetches a single market account by ID with websocket subscription for real-time updates.
 *
 * Uses useReadOnlyProgram so market data loads without a connected wallet.
 * Subscribes to on-chain account changes via connection.onAccountChange,
 * invalidating the query when the market PDA is modified on-chain.
 */
export function useMarket(marketId: number) {
  const program = useReadOnlyProgram();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["market", marketId],
    queryFn: async () => {
      const [marketPda] = getMarketPda(marketId);
      const account = await program.account.market.fetch(marketPda);
      return mapMarketAccount(marketPda, account as any);
    },
    enabled: marketId >= 0,
  });

  // Websocket subscription for real-time updates
  useEffect(() => {
    const [marketPda] = getMarketPda(marketId);
    const subId = connection.onAccountChange(marketPda, () => {
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
    });
    return () => {
      connection.removeAccountChangeListener(subId);
    };
  }, [connection, marketId, queryClient]);

  return query;
}
