import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import type { MockMarket } from '#/lib/mock-data'

interface BetPlacementProps {
  market: MockMarket
}

export function BetPlacement({ market }: BetPlacementProps) {
  const isResolved = market.status === 'resolved'

  if (isResolved) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Market Resolved</h2>
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            This market has been resolved.
          </p>
          <p
            className={cn(
              'text-xl font-bold',
              market.outcome === 'yes' ? 'text-emerald' : 'text-destructive-foreground'
            )}
          >
            Outcome: {market.outcome === 'yes' ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Place Your Bet</h2>

      {/* Amount input */}
      <div className="mb-4">
        <label
          htmlFor="bet-amount"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Amount (USDC)
        </label>
        <div className="relative">
          <input
            id="bet-amount"
            type="number"
            min="1"
            step="1"
            placeholder="Min $1"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            USDC
          </span>
        </div>
      </div>

      {/* Yes/No buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold"
          size="lg"
        >
          Yes
        </Button>
        <Button variant="secondary" size="lg" className="font-semibold">
          No
        </Button>
      </div>
    </div>
  )
}
