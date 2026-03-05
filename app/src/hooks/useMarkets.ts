import { useQuery } from "@tanstack/react-query";
import { useReadOnlyProgram } from "#/lib/anchor";
import { mapMarketAccount } from "#/lib/types";

/**
 * Fetches all Market accounts from the on-chain program and maps them
 * to typed OnChainMarket[]. Uses read-only program so markets load
 * even without a wallet connected.
 *
 * Auto-polls every 20 seconds to keep the market feed fresh.
 */
export function useMarkets() {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const accounts = await program.account.market.all();
      return accounts.map((a) => mapMarketAccount(a.publicKey, a.account));
    },
    refetchInterval: 20_000, // Auto-poll every 20s
    enabled: !!program,
  });
}
