import { cn } from '#/lib/utils'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import type { MockMarket } from '#/lib/mock-data'

interface MarketDetailProps {
  market: MockMarket
}

export function MarketDetail({ market }: MarketDetailProps) {
  const isResolved = market.status === 'resolved'

  return (
    <div className="rounded-xl border bg-card p-6">
      {/* Category + status row */}
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
          {market.category}
        </span>
        {isResolved ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                market.outcome === 'yes'
                  ? 'bg-emerald/15 text-emerald'
                  : 'bg-destructive/15 text-destructive-foreground'
              )}
            >
              {market.outcome === 'yes' ? 'Yes Won' : 'No Won'}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald">
            <span className="size-1.5 rounded-full bg-emerald animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Question */}
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        {market.question}
      </h1>

      {/* Description */}
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        {market.description}
      </p>

      {/* Info grid */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Resolution Source
          </p>
          <p className="text-sm text-foreground">{market.resolutionSource}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Deadline
          </p>
          <CountdownTimer deadline={market.deadline} className="text-sm" />
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Total Bets
          </p>
          <p className="text-sm text-foreground">{market.betCount}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Category
          </p>
          <p className="text-sm text-foreground">{market.category}</p>
        </div>
      </div>

      {/* Fogged sentiment section */}
      <div className="mb-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
          Market Sentiment
        </p>
        <FogOverlay density="light" revealed={isResolved}>
          <p
            className={cn(
              'text-lg font-semibold',
              market.sentiment === 'Leaning Yes' && 'text-emerald',
              market.sentiment === 'Even' && 'text-muted-foreground',
              market.sentiment === 'Leaning No' && 'text-destructive-foreground'
            )}
          >
            {market.sentiment}
          </p>
        </FogOverlay>
      </div>

      {/* Fogged pool totals section */}
      <div>
        <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
          Total Pool
        </p>
        <FogOverlay density="heavy" revealed={isResolved}>
          <p className="text-2xl font-bold text-gold">{market.poolTotal}</p>
        </FogOverlay>
      </div>
    </div>
  )
}
