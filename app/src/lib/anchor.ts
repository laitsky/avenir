import { useMemo } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Avenir } from "#/lib/idl/avenir";
import idl from "#/lib/idl/avenir.json";

/**
 * Creates a read-only AnchorProvider for non-hook code that needs to fetch
 * on-chain data (e.g. MXE public key lookup). Uses a dummy wallet that
 * cannot sign -- suitable for account reads only.
 */
export function createReadonlyAnchorProvider(
  connection: Connection
): AnchorProvider {
  const dummyWallet = {
    publicKey: new PublicKey("11111111111111111111111111111111"),
    payer: undefined,
    signTransaction: async () => {
      throw new Error("Read-only provider");
    },
    signAllTransactions: async () => {
      throw new Error("Read-only provider");
    },
  } as any;

  return new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });
}

/**
 * Returns a typed Program<Avenir> instance when wallet is connected.
 * Returns null when wallet is not connected.
 * Memoized on connection and publicKey to avoid recreation on re-renders.
 */
export function useAnchorProgram(): Program<Avenir> | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });

    return new Program<Avenir>(idl as unknown as Avenir, provider);
  }, [connection, wallet.publicKey]);
}

/**
 * Returns a typed Program<Avenir> for read-only operations without a wallet.
 * Uses a dummy wallet that cannot sign -- suitable for account fetching only.
 * This ensures market data can be loaded without a connected wallet.
 */
export function useReadOnlyProgram(): Program<Avenir> {
  const { connection } = useConnection();

  return useMemo(() => {
    return new Program<Avenir>(
      idl as unknown as Avenir,
      createReadonlyAnchorProvider(connection)
    );
  }, [connection]);
}
