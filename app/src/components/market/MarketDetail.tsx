import { useRef, useEffect, useState } from 'react'
import { cn } from '#/lib/utils'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import { DisputeBanner } from '#/components/dispute/DisputeBanner'
import { DisputeStepper } from '#/components/dispute/DisputeStepper'
import type { OnChainMarket, OnChainDispute } from '#/lib/types'
import { CATEGORY_MAP, SENTIMENT_MAP } from '#/lib/types'

interface MarketDetailProps {
  market: OnChainMarket
  dispute?: OnChainDispute | null
}

export function MarketDetail({ market, dispute = null }: MarketDetailProps) {
  const category = CATEGORY_MAP[market.category] ?? 'Unknown'
  const deadline = new Date(market.resolutionTime * 1000)
  const sentimentLabel = SENTIMENT_MAP[market.sentiment] ?? 'Unknown'
  const isFinalized = market.state === 4
  const isResolved = market.state === 2
  const isOpen = market.state === 0
  const isDisputed = market.state === 3

  // Track previous state to detect live finalization transition
  const prevStateRef = useRef(market.state)
  const [animateReveal, setAnimateReveal] = useState(false)

  useEffect(() => {
    // If user is on the page when market transitions from Resolved(2) to Finalized(4)
    if (prevStateRef.current === 2 && market.state === 4) {
      setAnimateReveal(true)
    }
    // Also trigger reveal on dispute settlement (Disputed->Resolved via dispute)
    if (prevStateRef.current === 3 && (market.state === 2 || market.state === 4)) {
      setAnimateReveal(true)
    }
    prevStateRef.current = market.state
  }, [market.state])

  // For finalized markets: if user arrived after finalization, show already revealed
  const fogRevealed = isFinalized

  // Status display
  const statusDisplay = isOpen
    ? 'Live'
    : isDisputed
      ? 'Disputed'
      : isFinalized
        ? 'Finalized'
        : isResolved
          ? 'Resolved'
          : 'Locked'

  // Probability bar: sentiment-based for live, revealed pool ratio for finalized
  let yesPercent = 50 // default even
  if (isFinalized && (market.revealedYesPool > 0 || market.revealedNoPool > 0)) {
    const total = market.revealedYesPool + market.revealedNoPool
    yesPercent = Math.round((market.revealedYesPool / total) * 100)
  } else {
    // Sentiment-based approximation for live markets
    if (market.sentiment === 1) yesPercent = 65 // Leaning Yes
    else if (market.sentiment === 2) yesPercent = 50 // Even
    else if (market.sentiment === 3) yesPercent = 35 // Leaning No
  }

  return (
    <div>
      {/* Status */}
      <div className="mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider">
        <span className="text-primary/50">{category}</span>
        <span className="text-border">|</span>
        {isFinalized ? (
          <span
            className={
              market.winningOutcome === 1
                ? 'text-primary'
                : 'text-destructive-foreground'
            }
          >
            Resolved {market.winningOutcome === 1 ? 'Yes' : 'No'}
          </span>
        ) : isResolved ? (
          <span className="text-muted-foreground">Awaiting Reveal</span>
        ) : isDisputed ? (
          <span className="flex items-center gap-1.5 text-purple-400">
            <span className="size-1.5 animate-pulse rounded-full bg-purple-400" />
            {statusDisplay}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            {statusDisplay}
          </span>
        )}
      </div>

      {/* Dispute banner and stepper */}
      {(isDisputed || (isOpen && market.resolutionTime < Date.now() / 1000)) && (
        <div className="mb-6 space-y-4">
          <DisputeBanner market={market} dispute={dispute} />
          {dispute && isDisputed && <DisputeStepper dispute={dispute} />}
        </div>
      )}

      {/* Dispute outcome reveal with fog-clear animation */}
      {dispute?.status === 2 && isFinalized && (
        <FogOverlay density="heavy" revealed={fogRevealed || animateReveal}>
          <div className="mb-6 rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-purple-400">
              Dispute Outcome
            </p>
            <p
              className={cn(
                'mt-1 font-serif text-xl italic font-semibold',
                market.winningOutcome === 1
                  ? 'text-primary'
                  : 'text-destructive-foreground',
              )}
            >
              Jury decided: {market.winningOutcome === 1 ? 'Yes' : 'No'}
            </p>
          </div>
        </FogOverlay>
      )}

      {/* Question */}
      <h1 className="mb-4 font-serif text-3xl italic leading-tight md:text-4xl">
        {market.question}
      </h1>

      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {market.resolutionSource}
      </p>

      {/* Probability bar */}
      <div className="mb-8">
        <div className="relative">
          <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="rounded-full bg-primary/70 transition-all duration-700"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          {!fogRevealed && (
            <FogOverlay
              density="light"
              revealed={false}
              className="absolute inset-0 rounded-full"
            >
              <div className="h-3" />
            </FogOverlay>
          )}
        </div>
        {fogRevealed && (
          <div className="mt-2 flex justify-between font-mono text-xs tabular-nums">
            <span className="text-primary">{yesPercent}% Yes</span>
            <span className="text-muted-foreground">
              {100 - yesPercent}% No
            </span>
          </div>
        )}
      </div>

      {/* Data grid */}
      <dl className="mb-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-6 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Source
          </dt>
          <dd className="mt-1 text-sm">{market.resolutionSource}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Deadline
          </dt>
          <dd className="mt-1">
            <CountdownTimer deadline={deadline} className="text-sm" />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Bets
          </dt>
          <dd className="mt-1 font-mono text-sm tabular-nums">
            {market.totalBets}
          </dd>
        </div>
      </dl>

      {/* Fogged sections */}
      <div className="space-y-5 border-t border-border pt-6">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sentiment
          </span>
          <FogOverlay density="light" revealed={fogRevealed} className="mt-1">
            <p
              className={cn(
                'text-lg font-semibold',
                sentimentLabel === 'Leaning Yes' && 'text-primary',
                sentimentLabel === 'Even' && 'text-muted-foreground',
                sentimentLabel === 'Leaning No' &&
                  'text-destructive-foreground',
              )}
            >
              {sentimentLabel}
            </p>
          </FogOverlay>
        </div>
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Pool
          </span>
          <FogOverlay
            density="heavy"
            revealed={fogRevealed}
            className="mt-1"
          >
            {isFinalized ? (
              <div className="space-y-1">
                <p className="font-mono text-2xl font-bold tabular-nums text-accent">
                  {(market.revealedYesPool / 1_000_000).toLocaleString()} USDC
                  Yes /{' '}
                  {(market.revealedNoPool / 1_000_000).toLocaleString()} USDC No
                </p>
              </div>
            ) : (
              <p className="font-mono text-2xl font-bold tabular-nums text-accent">
                Encrypted
              </p>
            )}
          </FogOverlay>
        </div>

        {/* Outcome badge for finalized markets */}
        {isFinalized && (
          <div className="mt-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Outcome
            </span>
            <div className="mt-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-4 py-1.5 font-serif text-lg italic font-semibold',
                  market.winningOutcome === 1
                    ? 'bg-primary/10 text-primary'
                    : 'bg-destructive/10 text-destructive-foreground',
                )}
              >
                {market.winningOutcome === 1 ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
