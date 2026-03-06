import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useReadOnlyProgram } from "#/lib/anchor";
import { PROGRAM_ID } from "#/lib/constants";

/**
 * Checks whether a connected wallet's CreatorWhitelist PDA exists on-chain.
 * Returns `true` if whitelisted, `false` if not (or wallet disconnected).
 *
 * Uses read-only program (no wallet signing required).
 * PDA seeds: ["whitelist", creator_pubkey]
 */
export function useWhitelist(walletPubkey: PublicKey | null) {
  const program = useReadOnlyProgram();

  return useQuery({
    queryKey: ["whitelist", walletPubkey?.toBase58()],
    queryFn: async (): Promise<boolean> => {
      if (!walletPubkey) return false;

      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), walletPubkey.toBuffer()],
        PROGRAM_ID
      );

      try {
        await program.account.creatorWhitelist.fetch(pda);
        return true;
      } catch {
        // PDA doesn't exist = not whitelisted
        return false;
      }
    },
    enabled: !!walletPubkey,
    staleTime: 60_000,
  });
}
