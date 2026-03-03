import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#/lib/utils'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import { Button } from '#/components/ui/button'
import type { MockMarket } from '#/lib/mock-data'

const cardVariants = cva(
  'rounded-xl border bg-card p-5 transition-colors cursor-pointer',
  {
    variants: {
      status: {
        live: 'border-border hover:border-sage/50',
        resolved: 'border-border/50 opacity-90',
      },
    },
    defaultVariants: {
      status: 'live',
    },
  },
)

interface MarketCardProps {
  market: MockMarket
  className?: string
}

export function MarketCard({ market, className }: MarketCardProps) {
  const isResolved = market.status === 'resolved'

  return (
    <div className={cn(cardVariants({ status: market.status }), className)}>
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
          {market.category}
        </span>
        <CountdownTimer deadline={market.deadline} />
      </div>

      {/* Question text */}
      <p className="mb-4 line-clamp-2 text-sm font-semibold text-foreground">
        {market.question}
      </p>

      {/* Fogged sentiment */}
      <div className="mb-3">
        <FogOverlay density="light" revealed={isResolved}>
          <span className="text-sm text-muted-foreground">
            {market.sentiment}
          </span>
        </FogOverlay>
      </div>

      {/* Fogged pool total */}
      <div className="mb-3">
        <FogOverlay density="heavy" revealed={isResolved}>
          <span className="text-lg font-bold text-gold">
            {market.poolTotal}
          </span>
        </FogOverlay>
      </div>

      {/* Stats row */}
      <div className="mb-3 flex items-center gap-4">
        <span className="text-xs text-muted-foreground">
          {market.betCount} bets
        </span>
        {isResolved && market.outcome && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              market.outcome === 'yes'
                ? 'bg-emerald/10 text-emerald'
                : 'bg-destructive/10 text-destructive-foreground',
            )}
          >
            {market.outcome === 'yes' ? 'Yes won' : 'No won'}
          </span>
        )}
      </div>

      {/* Quick-bet buttons (live only) */}
      {!isResolved && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="bg-gold text-gold-foreground hover:bg-gold/90"
          >
            Yes
          </Button>
          <Button size="sm" variant="secondary">
            No
          </Button>
        </div>
      )}
    </div>
  )
}
