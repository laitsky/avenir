import { useMemo } from 'react'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import type { Avenir } from '#/lib/idl/avenir'
import idl from '#/lib/idl/avenir.json'

/**
 * Returns a typed Program<Avenir> instance when wallet is connected.
 * Returns null when wallet is not connected.
 * Memoized on connection and publicKey to avoid recreation on re-renders.
 */
export function useAnchorProgram(): Program<Avenir> | null {
  const { connection } = useConnection()
  const wallet = useWallet()

  return useMemo(() => {
    if (!wallet.publicKey) return null

    const provider = new AnchorProvider(
      connection,
      wallet as unknown as Parameters<typeof AnchorProvider['prototype']['constructor']>[1],
      { commitment: 'confirmed' },
    )

    return new Program<Avenir>(idl as unknown as Avenir, provider)
  }, [connection, wallet.publicKey])
}

/**
 * Returns a typed Program<Avenir> for read-only operations without a wallet.
 * Uses a dummy wallet that cannot sign -- suitable for account fetching only.
 * This ensures market data can be loaded without a connected wallet.
 */
export function useReadOnlyProgram(): Program<Avenir> {
  const { connection } = useConnection()

  return useMemo(() => {
    const dummyWallet = {
      publicKey: null,
      signTransaction: () => Promise.reject(new Error('Read-only provider')),
      signAllTransactions: () =>
        Promise.reject(new Error('Read-only provider')),
    }

    const provider = new AnchorProvider(
      connection,
      dummyWallet as unknown as Parameters<typeof AnchorProvider['prototype']['constructor']>[1],
      { commitment: 'confirmed' },
    )

    return new Program<Avenir>(idl as unknown as Avenir, provider)
  }, [connection])
}
