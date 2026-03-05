import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { USDC_MINT } from "#/lib/constants";

/**
 * Fetches the connected wallet's USDC balance from their Associated Token Account.
 * Returns 0 if wallet is not connected or ATA does not exist.
 *
 * Auto-polls every 30 seconds to keep balance display current.
 */
export function useUsdcBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["usdc-balance", publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0;
      const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      try {
        const account = await getAccount(connection, ata);
        return Number(account.amount) / 1_000_000; // USDC has 6 decimals
      } catch {
        return 0; // No ATA = 0 balance
      }
    },
    enabled: !!publicKey,
    refetchInterval: 30_000, // Refresh balance every 30s
  });
}
