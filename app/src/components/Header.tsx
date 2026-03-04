import { Link } from '@tanstack/react-router'
import { ClientOnly } from '@tanstack/react-router'
import { WalletButton } from '#/components/wallet/WalletButton'

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-transparent" />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="font-sans text-xl font-extralight tracking-[0.15em] uppercase text-foreground transition-colors hover:text-primary no-underline"
        >
          Avenir
        </Link>

        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground no-underline [&.active]:text-foreground"
            activeProps={{ className: 'active text-foreground' }}
            activeOptions={{ exact: true }}
          >
            Markets
          </Link>
          <Link
            to="/portfolio"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground no-underline [&.active]:text-foreground"
            activeProps={{ className: 'active text-foreground' }}
          >
            Portfolio
          </Link>
          <ClientOnly
            fallback={
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-4 py-2 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
              >
                Connect Wallet
              </button>
            }
          >
            <WalletButton />
          </ClientOnly>
        </div>
      </nav>
    </header>
  )
}
