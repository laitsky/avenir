import { cn } from '#/lib/utils'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import type { OnChainMarket, OnChainDispute } from '#/lib/types'

interface DisputeBannerProps {
  market: OnChainMarket
  dispute: OnChainDispute | null
}

/** Grace period duration: 48 hours in seconds */
const GRACE_PERIOD_SECONDS = 172_800

export function DisputeBanner({ market, dispute }: DisputeBannerProps) {
  const now = Date.now() / 1000
  const graceDeadline = market.resolutionTime + GRACE_PERIOD_SECONDS
  const deadlinePassed = market.resolutionTime < now
  const graceExpired = now > graceDeadline

  // Grace period: market is still Open, deadline passed, grace not expired
  const isGracePeriod =
    market.state === 0 && deadlinePassed && !graceExpired

  // Active dispute: market state is Disputed (3)
  const isDisputed = market.state === 3

  // Settled dispute: dispute exists and is settled
  const isSettled = dispute?.status === 2

  if (!isGracePeriod && !isDisputed) return null

  // Grace period banner
  if (isGracePeriod) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-medium text-amber-400">
            Grace Period
          </span>
        </div>
        <p className="mt-1.5 text-sm text-amber-300/70">
          Waiting for creator resolution -- dispute eligible in{' '}
          <CountdownTimer
            deadline={new Date(graceDeadline * 1000)}
            className="text-sm text-amber-400"
          />
        </p>
      </div>
    )
  }

  // Settled dispute
  if (isDisputed && isSettled) {
    const outcomeLabel = market.winningOutcome === 1 ? 'Yes' : 'No'
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg
            className="size-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-medium text-primary">
            Dispute Resolved
          </span>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Jury outcome:{' '}
          <span
            className={cn(
              'font-semibold',
              market.winningOutcome === 1
                ? 'text-primary'
                : 'text-destructive-foreground',
            )}
          >
            {outcomeLabel}
          </span>
        </p>
      </div>
    )
  }

  // Finalizing dispute
  if (dispute?.status === 1) {
    return (
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
          <span className="text-sm font-medium text-purple-400">
            Dispute Finalizing
          </span>
        </div>
        <p className="mt-1.5 text-sm text-purple-300/70">
          Dispute finalizing -- revealing outcome...
        </p>
      </div>
    )
  }

  // Active voting dispute
  return (
    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-purple-500 animate-pulse" />
        <span className="text-sm font-medium text-purple-400">
          Market in Dispute
        </span>
      </div>
      <p className="mt-1.5 text-sm text-purple-300/70">
        Jury voting in progress --{' '}
        <span className="font-mono tabular-nums text-purple-400">
          {dispute?.voteCount ?? 0}/{dispute?.jurors.length ?? 7}
        </span>{' '}
        votes submitted
      </p>
      {dispute && (
        <p className="mt-1 text-xs text-purple-300/50">
          Voting ends:{' '}
          <CountdownTimer
            deadline={new Date(dispute.votingEnd * 1000)}
            className="text-xs text-purple-400/70"
          />
        </p>
      )}
    </div>
  )
}
