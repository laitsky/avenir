import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { toast } from "sonner";
import { useAnchorProgram } from "#/lib/anchor";
import {
  getArciumClusterOffset,
  getArciumProgramId,
  getClockAddress,
  getClusterAccountAddress,
  getComputationAccountAddress,
  getComputationDefinitionAddress,
  getExecutingPoolAddress,
  getFeePoolAddress,
  getMXEAccountAddress,
  getMempoolAccountAddress,
} from "#/lib/arcium";
import { encryptVoteForMpcClient } from "#/lib/client-encryption";
import { PROGRAM_ID } from "#/lib/constants";
import {
  getMarketPda,
  getDisputePda,
  getDisputeTallyPda,
  getResolverPda,
} from "#/lib/pda";

/**
 * Hook for submitting encrypted juror votes on active disputes.
 *
 * Encrypts the vote boolean in-browser via the shared client-encryption helper,
 * builds and sends the cast_vote transaction with all required PDA accounts.
 *
 * Returns { castVote, loading, error } for the JurorVotePanel UI.
 */
export function useCastVote(marketId: number) {
  const program = useAnchorProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function castVote(isYes: boolean): Promise<void> {
    if (!program || !publicKey) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Encrypt the vote boolean (browser-side)
      const encrypted = await encryptVoteForMpcClient(
        connection,
        PROGRAM_ID,
        isYes
      );

      // 2. Derive all PDAs
      const [marketPda] = getMarketPda(marketId);
      const [disputePda] = getDisputePda(marketId);
      const [disputeTallyPda] = getDisputeTallyPda(marketId);
      const [resolverPda] = getResolverPda(publicKey);

      // Random computation offset
      const computationOffset = new BN(
        crypto.getRandomValues(new Uint8Array(8))
      );

      // 3. Arcium account derivation
      const clusterOffset = getArciumClusterOffset();

      const arciumAccounts = {
        mxeAccount: getMXEAccountAddress(PROGRAM_ID),
        signPdaAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("ArciumSignerAccount")],
          PROGRAM_ID
        )[0],
        mempoolAccount: getMempoolAccountAddress(clusterOffset),
        executingPool: getExecutingPoolAddress(clusterOffset),
        computationAccount: getComputationAccountAddress(
          computationOffset,
          clusterOffset
        ),
        compDefAccount: getComputationDefinitionAddress(
          PROGRAM_ID,
          "add_dispute_vote"
        ),
        clusterAccount: getClusterAccountAddress(clusterOffset),
        poolAccount: getFeePoolAddress(),
        clockAccount: getClockAddress(),
        arciumProgram: getArciumProgramId(),
      };

      // 4. Submit cast_vote transaction
      const sig = await program.methods
        .castVote(
          computationOffset,
          encrypted.voteCiphertext as any,
          encrypted.publicKey as any,
          new BN(encrypted.nonceBN)
        )
        .accountsPartial({
          juror: publicKey,
          dispute: disputePda,
          disputeTally: disputeTallyPda,
          market: marketPda,
          resolver: resolverPda,
          systemProgram: SystemProgram.programId,
          ...arciumAccounts,
        })
        .rpc({ commitment: "confirmed" });

      // 5. Invalidate queries for real-time update
      queryClient.invalidateQueries({ queryKey: ["dispute", marketId] });
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });

      toast.success(`Vote submitted: ${isYes ? "Yes" : "No"}`, {
        action: {
          label: "View",
          onClick: () =>
            window.open(
              `https://solscan.io/tx/${sig}?cluster=devnet`,
              "_blank"
            ),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(`Failed to submit vote: ${msg}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { castVote, loading, error };
}
