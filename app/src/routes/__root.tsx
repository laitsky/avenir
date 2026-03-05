import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { Toaster } from 'sonner'
import { Header } from '#/components/Header'
import { WalletSelectorProvider } from '#/components/wallet/WalletSelectorProvider'
import { RPC_ENDPOINT } from '#/lib/constants'

import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Avenir -- Encrypted Prediction Markets' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Lora:ital,wght@0,400..700;1,400..700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootLayout,
  notFoundComponent: RootNotFound,
})

/**
 * Shared shell used for SSR fallback and hydrated app content.
 * Keeps layout identical to avoid visible shifts.
 */
function AppShell() {
  return (
    <>
      <Header />
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-24">
        <Outlet />
      </main>
    </>
  )
}

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ConnectionProvider endpoint={RPC_ENDPOINT}>
          <WalletProvider
            wallets={[]}
            autoConnect
            onError={(error) => {
              console.error('[wallet]', error.name, error.message)
            }}
          >
            <WalletSelectorProvider>
              <AppShell />
              <Toaster theme="dark" position="bottom-right" />
            </WalletSelectorProvider>
          </WalletProvider>
        </ConnectionProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootNotFound() {
  return (
    <div className="py-20 text-center">
      <p className="mb-3 font-serif text-2xl italic">Page not found</p>
      <a
        href="/"
        className="rounded-lg border border-accent/25 bg-accent/5 px-4 py-2 text-[13px] font-medium text-accent no-underline transition-all hover:border-accent/40 hover:bg-accent/10"
      >
        Browse Markets
      </a>
    </div>
  )
}
