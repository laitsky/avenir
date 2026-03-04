import { cn } from '#/lib/utils'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import type { OnChainMarket } from '#/lib/types'
import { CATEGORY_MAP, SENTIMENT_MAP } from '#/lib/types'

interface MarketCardProps {
  market: OnChainMarket
  className?: string
  style?: React.CSSProperties
}

/**
 * Converts a sentiment enum value to an approximate visual percentage for the bar.
 * These are visual-only hints since actual pool data is encrypted.
 */
function sentimentToPercent(sentiment: number): number {
  switch (sentiment) {
    case 1: return 65  // Leaning Yes
    case 2: return 50  // Even
    case 3: return 35  // Leaning No
    default: return 50 // Unknown
  }
}

/** Grace period: 48h in seconds */
const GRACE_PERIOD_SECONDS = 172_800

export function MarketCard({ market, className, style }: MarketCardProps) {
  const isFinalized = market.state === 4 // Finalized
  const isResolved = market.state === 2 || isFinalized // Resolved or Finalized
  const isLive = market.state === 0 || market.state === 1 // Open or Locked
  const isDisputed = market.state === 3 // Disputed

  // Grace period: market is Open, deadline passed, grace not expired
  const now = Date.now() / 1000
  const deadlinePassed = market.resolutionTime < now
  const graceDeadline = market.resolutionTime + GRACE_PERIOD_SECONDS
  const isGracePeriod = market.state === 0 && deadlinePassed && now <= graceDeadline

  // Compute probability display
  const yesPercent = isFinalized && (market.revealedYesPool + market.revealedNoPool) > 0
    ? (market.revealedYesPool / (market.revealedYesPool + market.revealedNoPool)) * 100
    : sentimentToPercent(market.sentiment)

  // Pool total display
  const poolDisplay = isFinalized
    ? `${((market.revealedYesPool + market.revealedNoPool) / 1_000_000).toLocaleString()} USDC`
    : 'Encrypted'

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
            {CATEGORY_MAP[market.category] ?? 'Other'}
          </span>
          {isLive && !isGracePeriod && (
            <span className="flex items-center gap-1 text-[11px] text-primary/40">
              <span className="size-1 animate-pulse rounded-full bg-primary/60" />
            </span>
          )}
          {isDisputed && (
            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-400">
              In Dispute
            </span>
          )}
          {isGracePeriod && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              Grace Period
            </span>
          )}
        </div>
        {isResolved ? (
          <span
            className={cn(
              'text-[11px] font-medium uppercase tracking-wider',
              market.winningOutcome === 1 ? 'text-primary' : 'text-destructive-foreground'
            )}
          >
            {market.winningOutcome === 1 ? 'Yes' : 'No'}
          </span>
        ) : (
          <CountdownTimer deadline={new Date(market.resolutionTime * 1000)} />
        )}
      </div>

      {/* Question -- serif italic, editorial */}
      <p className="mb-4 line-clamp-2 font-serif text-lg italic leading-snug text-foreground">
        {market.question}
      </p>

      {/* Probability bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="rounded-full bg-primary/70 transition-all duration-500"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          {!isFinalized && (
            <FogOverlay density="light" revealed={isFinalized} className="absolute inset-0 rounded-full">
              <div className="h-1.5" />
            </FogOverlay>
          )}
        </div>
        {isFinalized && (
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums">
            <span className="text-primary">{Math.round(yesPercent)}% Yes</span>
            <span className="text-muted-foreground">{Math.round(100 - yesPercent)}% No</span>
          </div>
        )}
      </div>

      {/* Pool + bets */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {market.totalBets} bets
        </span>
        <FogOverlay density="heavy" revealed={isFinalized}>
          <span className="font-mono text-[11px] tabular-nums text-accent">
            {poolDisplay}
          </span>
        </FogOverlay>
      </div>

      {/* Sentiment indicator for live markets */}
      {isLive && (
        <div className="mb-4">
          <FogOverlay density="light">
            <span className="text-[11px] text-muted-foreground">
              {SENTIMENT_MAP[market.sentiment] ?? 'Unknown'}
            </span>
          </FogOverlay>
        </div>
      )}

      {/* Action chips */}
      {isLive && !isDisputed && !isGracePeriod && (
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
