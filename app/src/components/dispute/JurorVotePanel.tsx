import { useState } from 'react'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import type { OnChainMarket, OnChainDispute } from '#/lib/types'
import { useCastVote } from '#/hooks/useCastVote'

interface JurorVotePanelProps {
  market: OnChainMarket
  dispute: OnChainDispute
}

/**
 * Voting panel for selected jurors, rendered in the bet panel area.
 *
 * Shows a prominent "selected as juror" header, YES/NO vote buttons,
 * voting window countdown, and encrypted vote count (no leaning signal).
 * After voting, shows confirmation with the juror's own choice displayed.
 */
export function JurorVotePanel({ market, dispute }: JurorVotePanelProps) {
  const { castVote, loading, error } = useCastVote(market.id)
  const [submitted, setSubmitted] = useState(false)
  const [submittedVote, setSubmittedVote] = useState<boolean | null>(null)

  async function handleVote(isYes: boolean) {
    try {
      await castVote(isYes)
      setSubmitted(true)
      setSubmittedVote(isYes)
    } catch {
      // Error is handled by the hook
    }
  }

  if (submitted && submittedVote !== null) {
    return (
      <div className="rounded-xl bg-card p-6">
        {/* Juror badge */}
        <div className="mb-4 rounded-lg bg-purple-500/10 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-purple-400">
            Juror Vote Submitted
          </p>
        </div>

        {/* Confirmation */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-purple-500/10">
            <svg
              className="size-6 text-purple-400"
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
          </div>
          <p className="font-medium text-purple-400">
            You voted:{' '}
            <span
              className={cn(
                'font-serif italic',
                submittedVote ? 'text-primary' : 'text-destructive-foreground',
              )}
            >
              {submittedVote ? 'Yes' : 'No'}
            </span>
          </p>
        </div>

        {/* Vote count (no leaning signal) */}
        <div className="mt-4 rounded-lg bg-secondary/50 px-4 py-3">
          <FogOverlay density="light">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Votes submitted
              </span>
              <span className="font-mono text-sm tabular-nums text-purple-400">
                {dispute.voteCount}/{dispute.jurors.length}
              </span>
            </div>
          </FogOverlay>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-card p-6">
      {/* Juror badge */}
      <div className="mb-4 rounded-lg bg-purple-500/10 px-4 py-3 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-purple-400">
          You've been selected as juror
        </p>
      </div>

      {/* Voting window countdown */}
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Voting window</span>
        <CountdownTimer
          deadline={new Date(dispute.votingEnd * 1000)}
          className="text-xs text-purple-400"
        />
      </div>

      {/* Vote count (no leaning signal, fogged) */}
      <div className="mb-6 rounded-lg bg-secondary/50 px-4 py-3">
        <FogOverlay density="light">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Votes submitted
            </span>
            <span className="font-mono text-sm tabular-nums text-purple-400">
              {dispute.voteCount}/{dispute.jurors.length}
            </span>
          </div>
        </FogOverlay>
      </div>

      {/* Vote buttons */}
      {loading ? (
        <div className="space-y-3 py-6">
          <VoteProgress />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="bg-primary/20 font-semibold text-primary hover:bg-primary/30"
            size="lg"
            onClick={() => handleVote(true)}
          >
            Vote Yes
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="font-semibold"
            onClick={() => handleVote(false)}
          >
            Vote No
          </Button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <p className="mt-3 text-center text-sm text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  )
}

function VoteProgress() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="size-6 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
      <p className="text-center text-sm text-muted-foreground">
        Encrypting and submitting vote...
      </p>
    </div>
  )
}
