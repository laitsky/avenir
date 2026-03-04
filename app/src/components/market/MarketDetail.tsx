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
    <div>
      {/* Status */}
      <div className="mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider">
        <span className="text-primary/50">{market.category}</span>
        <span className="text-border">|</span>
        {isResolved ? (
          <span className={market.outcome === 'yes' ? 'text-primary' : 'text-destructive-foreground'}>
            Resolved {market.outcome === 'yes' ? 'Yes' : 'No'}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        )}
      </div>

      {/* Question — large serif italic */}
      <h1 className="mb-4 font-serif text-3xl italic leading-tight md:text-4xl">
        {market.question}
      </h1>

      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {market.description}
      </p>

      {/* Probability bar — large */}
      <div className="mb-8">
        <div className="relative">
          <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="rounded-full bg-primary/70 transition-all duration-700"
              style={{ width: `${market.yesPercent}%` }}
            />
          </div>
          {!isResolved && (
            <FogOverlay density="light" revealed={isResolved} className="absolute inset-0 rounded-full">
              <div className="h-3" />
            </FogOverlay>
          )}
        </div>
        {isResolved && (
          <div className="mt-2 flex justify-between font-mono text-xs tabular-nums">
            <span className="text-primary">{market.yesPercent}% Yes</span>
            <span className="text-muted-foreground">{100 - market.yesPercent}% No</span>
          </div>
        )}
      </div>

      {/* Data grid */}
      <dl className="mb-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-6 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Source</dt>
          <dd className="mt-1 text-sm">{market.resolutionSource}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deadline</dt>
          <dd className="mt-1">
            <CountdownTimer deadline={market.deadline} className="text-sm" />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bets</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums">{market.betCount}</dd>
        </div>
      </dl>

      {/* Fogged sections */}
      <div className="space-y-5 border-t border-border pt-6">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sentiment</span>
          <FogOverlay density="light" revealed={isResolved} className="mt-1">
            <p className={cn(
              'text-lg font-semibold',
              market.sentiment === 'Leaning Yes' && 'text-primary',
              market.sentiment === 'Even' && 'text-muted-foreground',
              market.sentiment === 'Leaning No' && 'text-destructive-foreground'
            )}>
              {market.sentiment}
            </p>
          </FogOverlay>
        </div>
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pool</span>
          <FogOverlay density="heavy" revealed={isResolved} className="mt-1">
            <p className="font-mono text-2xl font-bold tabular-nums text-accent">{market.poolTotal}</p>
          </FogOverlay>
        </div>
      </div>
    </div>
  )
}
