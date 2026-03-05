import { useState, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, X, Search } from 'lucide-react'
import { WalletButton } from '#/components/wallet/WalletButton'
import { SearchBar } from '#/components/search/SearchBar'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Body scroll lock when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      {/* Mobile search overlay */}
      {searchOpen && (
        <SearchBar mobile onClose={() => setSearchOpen(false)} />
      )}

      <header className="fixed top-0 z-50 w-full">
        {/* Gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/90 to-transparent" />

        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="font-sans text-xl font-extralight tracking-[0.15em] uppercase text-foreground transition-colors hover:text-primary no-underline"
          >
            Avenir
          </Link>

          {/* Desktop nav (md+) */}
          <div className="hidden md:flex items-center gap-6">
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
            <SearchBar />
            <WalletButton />
          </div>

          {/* Mobile icon buttons (below md) */}
          <div className="flex md:hidden items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Search markets"
            >
              <Search className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="fixed top-[72px] left-0 right-0 z-40 border-b border-border bg-background/98 backdrop-blur-sm">
            <div className="flex flex-col">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[44px] items-center px-6 py-4 text-[15px] text-muted-foreground transition-colors hover:text-foreground no-underline [&.active]:text-foreground"
                activeProps={{ className: 'active text-foreground' }}
                activeOptions={{ exact: true }}
              >
                Markets
              </Link>
              <Link
                to="/portfolio"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[44px] items-center px-6 py-4 text-[15px] text-muted-foreground transition-colors hover:text-foreground no-underline [&.active]:text-foreground"
                activeProps={{ className: 'active text-foreground' }}
              >
                Portfolio
              </Link>
              <div className="px-6 py-4">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
