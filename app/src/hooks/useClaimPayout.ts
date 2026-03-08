import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { toast } from "sonner";
import { useAnchorProgram, useReadOnlyProgram } from "#/lib/anchor";
import { USDC_MINT } from "#/lib/constants";
import {
  getMarketPda,
  getVaultPda,
  getPositionPda,
} from "#/lib/pda";

/**
 * Submits a claimPayout instruction for winners.
 *
 * Derives all required PDAs: market, position, vault.
 * Fetches the market snapshot to determine the fee recipient's token account.
 */
export function useClaimPayout(marketId: number) {
  const program = useAnchorProgram();
  const readOnlyProgram = useReadOnlyProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error("Wallet not connected");
      }

      const [marketPda] = getMarketPda(marketId);
      const [vaultPda] = getVaultPda(marketId);
      const [positionPda] = getPositionPda(marketId, publicKey);

      // User's USDC ATA
      const winnerTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      // claim_payout validates against market.config_fee_recipient, not the
      // current Config account, so derive the ATA from the market snapshot.
      const market = await readOnlyProgram.account.market.fetch(marketPda);
      const feeRecipientTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        (market as any).configFeeRecipient
      );

      const sig = await program.methods
        .claimPayout()
        .accountsPartial({
          winner: publicKey,
          market: marketPda,
          userPosition: positionPda,
          marketVault: vaultPda,
          winnerTokenAccount,
          feeRecipientTokenAccount,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ commitment: "confirmed" });

      return sig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position", marketId] });
      queryClient.invalidateQueries({
        queryKey: ["usdc-balance"],
      });
      toast.success("Payout claimed!");
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to claim payout: ${msg}`);
    },
  });
}
