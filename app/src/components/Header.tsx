import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <nav className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-foreground no-underline"
          >
            Avenir
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/portfolio"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground no-underline [&.active]:text-foreground"
            activeProps={{ className: 'active text-foreground' }}
          >
            Portfolio
          </Link>
          <Button variant="outline" size="sm">
            Connect Wallet
          </Button>
        </div>
      </nav>
    </header>
  )
}
