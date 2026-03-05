import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import type { WalletName } from '@solana/wallet-adapter-base'

interface WalletSelectorContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const WalletSelectorContext = createContext<WalletSelectorContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function useWalletSelector() {
  return useContext(WalletSelectorContext)
}

function isConnectable(readyState: WalletReadyState) {
  return (
    readyState === WalletReadyState.Installed ||
    readyState === WalletReadyState.Loadable
  )
}

function readyStateLabel(readyState: WalletReadyState): string {
  switch (readyState) {
    case WalletReadyState.Installed:
      return 'Installed'
    case WalletReadyState.Loadable:
      return 'Loadable'
    case WalletReadyState.NotDetected:
      return 'Not detected'
    case WalletReadyState.Unsupported:
      return 'Unsupported'
    default:
      return String(readyState)
  }
}

export function WalletSelectorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { wallets, wallet, select, connect, connecting } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingWallet, setPendingWallet] = useState<WalletName | null>(null)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const handleSelect = useCallback(
    (walletName: WalletName) => {
      select(walletName)
      setPendingWallet(walletName)
      setIsOpen(false)
    },
    [select],
  )

  useEffect(() => {
    if (!pendingWallet) return
    if (wallet?.adapter.name !== pendingWallet) return
    if (connecting) return

    let cancelled = false
    void (async () => {
      try {
        await connect()
      } catch (error) {
        if (!cancelled) {
          console.error('[wallet]', error)
        }
      } finally {
        if (!cancelled) setPendingWallet(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [connect, connecting, pendingWallet, wallet?.adapter.name])

  useEffect(() => {
    if (!isOpen) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [isOpen])

  const value = useMemo(
    () => ({ isOpen, open, close }),
    [isOpen, open, close],
  )

  return (
    <WalletSelectorContext.Provider value={value}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1200] bg-black/60"
          onClick={close}
          role="presentation"
        >
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <div
              className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Select wallet"
            >
              <p className="mb-3 font-serif text-xl italic">Connect Wallet</p>
              <div className="space-y-2">
                {wallets.length === 0 && (
                  <p className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                    No wallets detected.
                  </p>
                )}
                {wallets.map((walletItem) => {
                  const canConnect = isConnectable(walletItem.readyState)
                  return (
                    <button
                      key={walletItem.adapter.name}
                      type="button"
                      onClick={() => {
                        if (canConnect) {
                          handleSelect(walletItem.adapter.name)
                          return
                        }
                        window.open(
                          walletItem.adapter.url,
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left transition-colors hover:bg-secondary/70"
                    >
                      <img
                        src={walletItem.adapter.icon}
                        alt={walletItem.adapter.name}
                        className="h-5 w-5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {walletItem.adapter.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {readyStateLabel(walletItem.readyState)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={close}
                className="mt-4 w-full cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </WalletSelectorContext.Provider>
  )
}
