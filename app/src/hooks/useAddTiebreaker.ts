import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { useAnchorProgram, useReadOnlyProgram } from "#/lib/anchor";
import {
  getDisputePda,
  getMarketPda,
  getResolverRegistryPda,
  getResolverPda,
} from "#/lib/pda";
import { selectTiebreakerJuror } from "#/lib/juror-selection";

/**
 * Submits the add_tiebreaker instruction for tie scenarios.
 *
 * This is a plain Anchor instruction (NOT an MPC queue instruction).
 * Any wallet can trigger it when a dispute has been reset to Voting after a tie.
 *
 * Selection is deterministic using selectTiebreakerJuror which replicates the
 * on-chain LCG algorithm with market_id and vote_count as seed inputs.
 * The client computes the exact tiebreaker juror before TX submission.
 */
export function useAddTiebreaker(marketId: number) {
  const program = useAnchorProgram();
  const readOnlyProgram = useReadOnlyProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) {
        throw new Error("Wallet not connected");
      }

      const [disputePda] = getDisputePda(marketId);
      const [marketPda] = getMarketPda(marketId);
      const [resolverRegistryPda] = getResolverRegistryPda();

      // Fetch registry to get resolver list
      const registry = await readOnlyProgram.account.resolverRegistry.fetch(
        resolverRegistryPda
      );
      const resolvers: PublicKey[] = (registry as any).resolvers;

      // Fetch dispute to get current jurors and vote count
      const dispute = await readOnlyProgram.account.dispute.fetch(disputePda);
      const currentJurors: PublicKey[] = (dispute as any).jurors;
      const voteCount: number = (dispute as any).voteCount;

      // Select tiebreaker using same deterministic algorithm as on-chain
      const selectedJuror = selectTiebreakerJuror(
        marketId,
        voteCount,
        resolvers,
        currentJurors
      );

      if (!selectedJuror) {
        throw new Error("No eligible resolver candidates for tiebreaker");
      }

      const candidateResolverPda = getResolverPda(selectedJuror)[0];

      const sig = await program.methods
        .addTiebreaker()
        .accountsPartial({
          payer: publicKey,
          dispute: disputePda,
          market: marketPda,
          resolverRegistry: resolverRegistryPda,
        })
        .remainingAccounts([
          {
            pubkey: candidateResolverPda,
            isSigner: false,
            isWritable: true,
          },
        ])
        .rpc({ commitment: "confirmed" });

      return sig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispute", marketId] });
      toast.success("Tiebreaker juror added -- voting extended 24h");
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to add tiebreaker: ${msg}`, {
        action: {
          label: "Retry",
          onClick: () => {
            /* caller can re-invoke mutate() */
          },
        },
      });
    },
  });
}
