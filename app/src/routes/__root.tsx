import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { Toaster } from 'sonner'
import { Header } from '#/components/Header'
import { RPC_ENDPOINT } from '#/lib/constants'

import '@solana/wallet-adapter-react-ui/styles.css'
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
  ssr: false,
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ConnectionProvider endpoint={RPC_ENDPOINT}>
          <WalletProvider wallets={[]} autoConnect>
            <WalletModalProvider>
              <Header />
              <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-24">
                <Outlet />
              </main>
              <Toaster theme="dark" position="bottom-right" />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
        <Scripts />
      </body>
    </html>
  )
}
