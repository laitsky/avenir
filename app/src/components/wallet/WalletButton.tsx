import { useState, useRef, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Copy, ExternalLink, LogOut } from 'lucide-react'
import { useUsdcBalance } from '#/hooks/useUsdcBalance'

/**
 * Truncates a base58 public key to "first4...last4" format.
 */
function truncateAddress(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

/**
 * Wallet connect button with connected state dropdown.
 *
 * - Disconnected: shows "Connect Wallet" button that opens wallet picker modal
 * - Connected: shows truncated address; click opens dropdown with:
 *   - Copy Address
 *   - View on Solscan
 *   - Disconnect
 */
export function WalletButton() {
  const { publicKey, connected, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()
  const { data: usdcBalance } = useUsdcBalance()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () =>
        document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const handleCopyAddress = useCallback(async () => {
    if (!publicKey) return
    await navigator.clipboard.writeText(publicKey.toBase58())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [publicKey])

  const handleViewOnSolscan = useCallback(() => {
    if (!publicKey) return
    window.open(
      `https://solscan.io/account/${publicKey.toBase58()}?cluster=devnet`,
      '_blank',
      'noopener,noreferrer',
    )
    setDropdownOpen(false)
  }, [publicKey])

  const handleDisconnect = useCallback(async () => {
    await disconnect()
    setDropdownOpen(false)
  }, [disconnect])

  // Disconnected state: show connect button
  if (!connected || !publicKey) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-4 py-2 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
      >
        Connect Wallet
      </button>
    )
  }

  // Connected state: show address with dropdown
  const address = publicKey.toBase58()

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-accent/25 bg-accent/5 px-4 py-2 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
      >
        {wallet?.adapter.icon && (
          <img
            src={wallet.adapter.icon}
            alt={wallet.adapter.name}
            className="h-4 w-4"
          />
        )}
        <span className="font-mono">{truncateAddress(address)}</span>
        <span className="text-muted-foreground">&middot;</span>
        <span className="font-mono tabular-nums">
          {(usdcBalance ?? 0).toFixed(2)} USDC
        </span>
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={handleCopyAddress}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-[13px] text-foreground transition-colors hover:bg-muted/50"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <button
            type="button"
            onClick={handleViewOnSolscan}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-[13px] text-foreground transition-colors hover:bg-muted/50"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            View on Solscan
          </button>
          <div className="border-t border-border" />
          <button
            type="button"
            onClick={handleDisconnect}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-[13px] text-destructive-foreground transition-colors hover:bg-muted/50"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
