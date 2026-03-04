import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import type { MockMarket } from '#/lib/mock-data'

interface BetPlacementProps {
  market: MockMarket
}

const QUICK_AMOUNTS = [10, 25, 50, 100] as const

export function BetPlacement({ market }: BetPlacementProps) {
  const isResolved = market.status === 'resolved'

  if (isResolved) {
    return (
      <div className="rounded-xl bg-card p-6">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Outcome
        </span>
        <p className={cn(
          'mt-3 font-serif text-2xl italic',
          market.outcome === 'yes' ? 'text-primary' : 'text-destructive-foreground'
        )}>
          {market.outcome === 'yes' ? 'Yes' : 'No'}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This market has been resolved.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Place Bet
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/50">USDC</span>
      </div>

      {/* Big terminal-style input */}
      <input
        type="number"
        min="1"
        step="1"
        placeholder="0"
        className="mb-4 w-full bg-transparent font-mono text-4xl font-light tabular-nums text-foreground outline-none placeholder:text-muted-foreground/15"
      />

      {/* Quick amounts */}
      <div className="mb-6 flex gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            className="cursor-pointer rounded-lg bg-secondary px-3 py-1.5 font-mono text-[11px] tabular-nums text-secondary-foreground transition-colors hover:bg-secondary/70"
          >
            {amount}
          </button>
        ))}
      </div>

      {/* Probability preview */}
      <div className="mb-6 rounded-lg bg-secondary/50 px-4 py-3">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Potential return</span>
          <span className="font-mono tabular-nums text-accent">—</span>
        </div>
      </div>

      {/* Yes / No */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          size="lg"
        >
          Bet Yes
        </Button>
        <Button variant="secondary" size="lg" className="font-semibold">
          Bet No
        </Button>
      </div>
    </div>
  )
}
