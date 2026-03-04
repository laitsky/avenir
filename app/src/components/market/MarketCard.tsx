import { cn } from '#/lib/utils'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import type { MockMarket } from '#/lib/mock-data'

interface MarketCardProps {
  market: MockMarket
  className?: string
  style?: React.CSSProperties
}

export function MarketCard({ market, className, style }: MarketCardProps) {
  const isResolved = market.status === 'resolved'

  return (
    <div
      style={style}
      className={cn(
        'group cursor-pointer rounded-xl bg-card p-5 transition-all duration-300 animate-fade-up',
        isResolved
          ? 'opacity-60 hover:opacity-80'
          : 'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:ring-1 hover:ring-primary/15',
        className
      )}
    >
      {/* Meta row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-primary/50">
            {market.category}
          </span>
          {!isResolved && (
            <span className="flex items-center gap-1 text-[11px] text-primary/40">
              <span className="size-1 animate-pulse rounded-full bg-primary/60" />
            </span>
          )}
        </div>
        {isResolved ? (
          <span
            className={cn(
              'text-[11px] font-medium uppercase tracking-wider',
              market.outcome === 'yes' ? 'text-primary' : 'text-destructive-foreground'
            )}
          >
            {market.outcome === 'yes' ? 'Yes' : 'No'}
          </span>
        ) : (
          <CountdownTimer deadline={market.deadline} />
        )}
      </div>

      {/* Question — serif italic, editorial */}
      <p className="mb-4 line-clamp-2 font-serif text-lg italic leading-snug text-foreground">
        {market.question}
      </p>

      {/* Probability bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="rounded-full bg-primary/70 transition-all duration-500"
              style={{ width: `${market.yesPercent}%` }}
            />
          </div>
          {!isResolved && (
            <FogOverlay density="light" revealed={isResolved} className="absolute inset-0 rounded-full">
              <div className="h-1.5" />
            </FogOverlay>
          )}
        </div>
        {isResolved && (
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums">
            <span className="text-primary">{market.yesPercent}% Yes</span>
            <span className="text-muted-foreground">{100 - market.yesPercent}% No</span>
          </div>
        )}
      </div>

      {/* Pool + bets */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {market.betCount} bets
        </span>
        <FogOverlay density="heavy" revealed={isResolved}>
          <span className="font-mono text-[11px] tabular-nums text-accent">
            {market.poolTotal}
          </span>
        </FogOverlay>
      </div>

      {/* Action chips */}
      {!isResolved && (
        <div className="flex gap-2">
          <span className="flex-1 cursor-pointer rounded-lg bg-primary/10 py-2 text-center text-xs font-medium text-primary transition-all group-hover:bg-primary/20">
            Yes
          </span>
          <span className="flex-1 cursor-pointer rounded-lg bg-secondary py-2 text-center text-xs font-medium text-secondary-foreground transition-all group-hover:bg-secondary/80">
            No
          </span>
        </div>
      )}
    </div>
  )
}
