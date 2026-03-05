import { useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUsdcBalance } from '#/hooks/useUsdcBalance'
import { useWalletSelector } from '#/components/wallet/WalletSelectorProvider'

function truncateAddress(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function WalletButton() {
  const { connected, publicKey, disconnect } = useWallet()
  const { open } = useWalletSelector()
  const { data: usdcBalance } = useUsdcBalance()

  const handleOpenModal = useCallback(() => {
    open()
  }, [open])

  const handleDisconnect = useCallback(() => {
    void disconnect()
  }, [disconnect])

  if (!connected || !publicKey) {
    return (
      <button
        type="button"
        onClick={handleOpenModal}
        className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-4 py-2 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleOpenModal}
        className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-4 py-2 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
      >
        {truncateAddress(publicKey.toBase58())}
      </button>
      <span className="hidden font-mono text-[12px] tabular-nums text-muted-foreground lg:inline">
        {(usdcBalance ?? 0).toFixed(2)} USDC
      </span>
      <button
        type="button"
        onClick={handleDisconnect}
        className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground transition-all hover:border-accent/30 hover:text-foreground"
      >
        Disconnect
      </button>
    </div>
  )
}
