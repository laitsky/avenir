import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import { JurorVotePanel } from '#/components/dispute/JurorVotePanel'
import type { OnChainMarket, OnChainPosition, OnChainDispute } from '#/lib/types'
import { usePlaceBet } from '#/hooks/usePlaceBet'
import { useOpenDispute } from '#/hooks/useOpenDispute'
import { useResolveMarket } from '#/hooks/useResolveMarket'
import { useComputePayouts } from '#/hooks/useComputePayouts'
import { useClaimPayout } from '#/hooks/useClaimPayout'
import { useFinalizeDispute } from '#/hooks/useFinalizeDispute'
import { useAddTiebreaker } from '#/hooks/useAddTiebreaker'

/** Grace period: 48h in seconds */
const GRACE_PERIOD_SECONDS = 172_800

interface BetPlacementProps {
  market: OnChainMarket
  position: OnChainPosition | null
  dispute?: OnChainDispute | null
}

type PanelMode =
  | 'bet'
  | 'resolve'
  | 'reveal-payouts'
  | 'claim-payout'
  | 'lost'
  | 'claimed'
  | 'resolved-no-position'
  | 'expired'
  | 'dispute-escalate'
  | 'juror-vote'
  | 'dispute-pending'
  | 'dispute-finalized'

const QUICK_AMOUNTS = [10, 25, 50, 100] as const

function getBetPanelMode(
  market: OnChainMarket,
  position: OnChainPosition | null,
  walletPubkey: string | null,
  dispute: OnChainDispute | null,
): PanelMode {
  const now = Date.now() / 1000
  const deadlinePassed = market.resolutionTime < now
  const graceDeadline = market.resolutionTime + GRACE_PERIOD_SECONDS
  const graceExpired = now > graceDeadline
  const isCreator =
    walletPubkey != null && market.creator.toBase58() === walletPubkey

  // Finalized (state=4)
  if (market.state === 4) {
    if (!position) return 'resolved-no-position'
    if (position.claimed) return 'claimed'
    const isWinner =
      (market.winningOutcome === 1 && position.yesAmount > 0) ||
      (market.winningOutcome === 2 && position.noAmount > 0)
    return isWinner ? 'claim-payout' : 'lost'
  }

  // Disputed (state=3)
  if (market.state === 3 && dispute) {
    // Dispute settled -- awaiting compute_payouts
    if (dispute.status === 2) return 'dispute-finalized'

    // Check if connected wallet is a selected juror who hasn't voted yet
    if (walletPubkey && dispute.status === 0) {
      const jurorIndex = dispute.jurors.findIndex(
        (j) => j.toBase58() === walletPubkey,
      )
      if (jurorIndex >= 0) {
        // Check if already voted (bitfield)
        const hasVoted = ((dispute.votesSubmitted >> jurorIndex) & 1) === 1
        if (!hasVoted) return 'juror-vote'
      }
    }

    return 'dispute-pending'
  }

  // Resolved (state=2) -- awaiting payout computation
  if (market.state === 2) return 'reveal-payouts'

  // Open (state=0) + deadline passed + grace expired -> escalate
  if (market.state === 0 && deadlinePassed && graceExpired) return 'dispute-escalate'

  // Open (state=0) + deadline passed + creator (within grace) -> resolve mode
  if (market.state === 0 && deadlinePassed && isCreator) return 'resolve'

  // Open (state=0) + deadline passed + grace not expired -> expired (waiting)
  if (market.state === 0 && deadlinePassed) return 'expired'

  // Open (state=0) + before deadline -> bet mode
  if (market.state === 0 && !deadlinePassed) return 'bet'

  return 'expired'
}

export function BetPlacement({ market, position, dispute = null }: BetPlacementProps) {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const walletPubkey = publicKey?.toBase58() ?? null
  const mode = getBetPanelMode(market, position, walletPubkey, dispute)

  switch (mode) {
    case 'bet':
      return (
        <BetMode
          market={market}
          position={position}
          connected={connected}
          onOpenWallet={() => setVisible(true)}
        />
      )
    case 'resolve':
      return <ResolveMode market={market} />
    case 'reveal-payouts':
      return <RevealPayoutsMode market={market} />
    case 'claim-payout':
      return <ClaimPayoutMode market={market} position={position!} />
    case 'lost':
      return <LostMode market={market} position={position!} />
    case 'claimed':
      return <ClaimedMode />
    case 'resolved-no-position':
      return <ResolvedNoPositionMode market={market} />
    case 'dispute-escalate':
      return (
        <DisputeEscalateMode
          market={market}
          connected={connected}
          onOpenWallet={() => setVisible(true)}
        />
      )
    case 'juror-vote':
      return <JurorVotePanel market={market} dispute={dispute!} />
    case 'dispute-pending':
      return (
        <DisputePendingMode
          market={market}
          dispute={dispute!}
          connected={connected}
          onOpenWallet={() => setVisible(true)}
        />
      )
    case 'dispute-finalized':
      return <DisputeFinalizedMode market={market} dispute={dispute!} />
    case 'expired':
      return <ExpiredMode />
  }
}

// =============================================================================
// BET MODE
// =============================================================================

function BetMode({
  market,
  position,
  connected,
  onOpenWallet,
}: {
  market: OnChainMarket
  position: OnChainPosition | null
  connected: boolean
  onOpenWallet: () => void
}) {
  const [amount, setAmount] = useState('')
  const [pendingBet, setPendingBet] = useState<{
    amount: number
    isYes: boolean
  } | null>(null)
  const placeBet = usePlaceBet(market.id)

  // Auto-execute pending bet after wallet connects
  useEffect(() => {
    if (connected && pendingBet) {
      placeBet.mutate(pendingBet)
      setPendingBet(null)
    }
  }, [connected, pendingBet])

  function handleBet(isYes: boolean) {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) return

    if (!connected) {
      setPendingBet({ amount: numAmount, isYes })
      onOpenWallet()
      return
    }

    placeBet.mutate({ amount: numAmount, isYes })
  }

  const hasPosition = position && (position.yesAmount > 0 || position.noAmount > 0)
  const isActive = placeBet.step !== 'idle' && placeBet.step !== 'error'

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Place Bet
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/50">
          USDC
        </span>
      </div>

      {/* Position display */}
      {hasPosition && (
        <div className="mb-4 rounded-lg bg-secondary/50 px-4 py-3">
          <span className="text-xs text-muted-foreground">Your position:</span>
          <span className="ml-2 font-mono text-sm">
            {position.yesAmount > 0
              ? `${(position.yesAmount / 1_000_000).toFixed(2)} USDC on Yes`
              : ''}
            {position.yesAmount > 0 && position.noAmount > 0 ? ' + ' : ''}
            {position.noAmount > 0
              ? `${(position.noAmount / 1_000_000).toFixed(2)} USDC on No`
              : ''}
          </span>
        </div>
      )}

      {/* Multi-step progress indicator */}
      {isActive ? (
        <BetProgress step={placeBet.step} retryCount={placeBet.retryCount} />
      ) : (
        <>
          {/* Big terminal-style input */}
          <input
            type="number"
            min="1"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mb-4 w-full bg-transparent font-mono text-4xl font-light tabular-nums text-foreground outline-none placeholder:text-muted-foreground/15"
          />

          {/* Quick amounts */}
          <div className="mb-6 flex gap-2">
            {QUICK_AMOUNTS.map((qa) => (
              <button
                key={qa}
                type="button"
                onClick={() => setAmount(String(qa))}
                className="cursor-pointer rounded-lg bg-secondary px-3 py-1.5 font-mono text-[11px] tabular-nums text-secondary-foreground transition-colors hover:bg-secondary/70"
              >
                {qa}
              </button>
            ))}
          </div>

          {/* Potential return placeholder */}
          <div className="mb-6 rounded-lg bg-secondary/50 px-4 py-3">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Potential return</span>
              <span className="font-mono tabular-nums text-accent">--</span>
            </div>
          </div>

          {/* Yes / No buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
              size="lg"
              onClick={() => handleBet(true)}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Bet Yes
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="font-semibold"
              onClick={() => handleBet(false)}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Bet No
            </Button>
          </div>
        </>
      )}

      {/* Error state with retry */}
      {placeBet.step === 'error' && (
        <div className="mt-4">
          <p className="mb-3 text-center text-sm text-destructive-foreground">
            Transaction failed
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => placeBet.reset()}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// BET PROGRESS INDICATOR
// =============================================================================

function BetProgress({
  step,
  retryCount,
}: {
  step: string
  retryCount: number
}) {
  const steps = [
    { key: 'encrypting', label: 'Encrypting...' },
    { key: 'submitting', label: 'Submitting...' },
    { key: 'confirming', label: 'Awaiting confirmation...' },
  ]

  if (step === 'retrying') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-center text-sm text-muted-foreground">
          Market busy -- retrying... (attempt {retryCount})
        </p>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="size-5 text-primary"
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
        <p className="text-center text-sm font-medium text-primary">
          Bet placed!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 py-6">
      {steps.map((s, i) => {
        const isActive = s.key === step
        const stepIndex = steps.findIndex((ss) => ss.key === step)
        const isDone = i < stepIndex

        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                isDone && 'bg-primary/10 text-primary',
                isActive && 'bg-primary text-primary-foreground',
                !isDone && !isActive && 'bg-secondary text-muted-foreground',
              )}
            >
              {isDone ? (
                <svg
                  className="size-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'text-sm',
                isActive && 'font-medium text-foreground',
                isDone && 'text-muted-foreground',
                !isDone && !isActive && 'text-muted-foreground/50',
              )}
            >
              {s.label}
            </span>
            {isActive && (
              <div className="ml-auto size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// RESOLVE MODE
// =============================================================================

function ResolveMode({ market }: { market: OnChainMarket }) {
  const resolveMarket = useResolveMarket(market.id)

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="mb-6">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Resolve Market
        </span>
        <p className="mt-2 text-sm text-muted-foreground">
          As the market creator, select the winning outcome.
        </p>
      </div>

      {resolveMarket.isPending ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">Resolving market...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
            size="lg"
            onClick={() => resolveMarket.mutate(1)}
          >
            Resolve Yes
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="font-semibold"
            onClick={() => resolveMarket.mutate(2)}
          >
            Resolve No
          </Button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// REVEAL PAYOUTS MODE
// =============================================================================

function RevealPayoutsMode({ market }: { market: OnChainMarket }) {
  const computePayouts = useComputePayouts(market.id)

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="mb-6">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Reveal Payouts
        </span>
        <p className="mt-2 text-sm text-muted-foreground">
          Market has been resolved. Trigger the MPC computation to reveal pool
          totals and enable claims.
        </p>
      </div>

      {computePayouts.isPending ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">
            Computing payouts via MPC...
          </p>
        </div>
      ) : (
        <Button
          className="w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          size="lg"
          onClick={() => computePayouts.mutate()}
        >
          Reveal Payouts
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// CLAIM PAYOUT MODE (winner)
// =============================================================================

function ClaimPayoutMode({
  market,
  position,
}: {
  market: OnChainMarket
  position: OnChainPosition
}) {
  const claimPayout = useClaimPayout(market.id)

  // Calculate estimated payout
  const totalPool = market.revealedYesPool + market.revealedNoPool
  const userWinning =
    market.winningOutcome === 1 ? position.yesAmount : position.noAmount
  const winningPool =
    market.winningOutcome === 1
      ? market.revealedYesPool
      : market.revealedNoPool

  let netPayout = 0
  if (winningPool > 0) {
    const gross = (userWinning * totalPool) / winningPool
    // Default 2% fee (200 bps) -- approximate for display
    const feeBps = 200
    netPayout = gross - (gross * feeBps) / 10000
  }

  return (
    <div className="rounded-xl bg-card p-6">
      <FogOverlay density="heavy" revealed className="mb-4 rounded-lg">
        <div className="px-4 py-6 text-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
            You won!
          </p>
          <p className="font-mono text-3xl font-bold tabular-nums text-accent">
            {(netPayout / 1_000_000).toFixed(2)} USDC
          </p>
        </div>
      </FogOverlay>

      {claimPayout.isPending ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">Claiming payout...</p>
        </div>
      ) : (
        <Button
          className="w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          size="lg"
          onClick={() => claimPayout.mutate()}
        >
          Claim {(netPayout / 1_000_000).toFixed(2)} USDC
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// LOST MODE
// =============================================================================

function LostMode({
  market,
  position,
}: {
  market: OnChainMarket
  position: OnChainPosition
}) {
  const losingAmount =
    market.winningOutcome === 1 ? position.noAmount : position.yesAmount
  const losingSide = market.winningOutcome === 1 ? 'No' : 'Yes'

  return (
    <div className="rounded-xl bg-card p-6">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Result
      </span>
      <div className="mt-4 rounded-lg bg-destructive/5 px-4 py-3">
        <p className="text-sm text-destructive-foreground/70">
          Your position: {(losingAmount / 1_000_000).toFixed(2)} USDC on{' '}
          {losingSide}
        </p>
        <p className="mt-1 text-sm text-destructive-foreground/70">
          Market resolved {market.winningOutcome === 1 ? 'Yes' : 'No'}
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// CLAIMED MODE
// =============================================================================

function ClaimedMode() {
  return (
    <div className="rounded-xl bg-card p-6">
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="size-6 text-primary"
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
        <p className="font-medium text-primary">Payout claimed</p>
        <p className="text-center text-xs text-muted-foreground">
          Your winnings have been transferred to your wallet.
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// RESOLVED NO POSITION MODE
// =============================================================================

function ResolvedNoPositionMode({ market }: { market: OnChainMarket }) {
  return (
    <div className="rounded-xl bg-card p-6">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Outcome
      </span>
      <p
        className={cn(
          'mt-3 font-serif text-2xl italic',
          market.winningOutcome === 1
            ? 'text-primary'
            : 'text-destructive-foreground',
        )}
      >
        {market.winningOutcome === 1 ? 'Yes' : 'No'}
      </p>
      {market.revealedYesPool > 0 || market.revealedNoPool > 0 ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {(market.revealedYesPool / 1_000_000).toLocaleString()} USDC Yes /{' '}
          {(market.revealedNoPool / 1_000_000).toLocaleString()} USDC No
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        This market has been resolved.
      </p>
    </div>
  )
}

// =============================================================================
// DISPUTE ESCALATE MODE
// =============================================================================

function DisputeEscalateMode({
  market,
  connected,
  onOpenWallet,
}: {
  market: OnChainMarket
  connected: boolean
  onOpenWallet: () => void
}) {
  const {
    mutate: escalate,
    step,
    retryCount,
    resolverCount,
    reset,
  } = useOpenDispute(market.id)

  function handleEscalate() {
    if (!connected) {
      onOpenWallet()
      return
    }
    escalate()
  }

  const isActive =
    step !== 'idle' && step !== 'error'
  const insufficientResolvers =
    resolverCount !== null && resolverCount < 7

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="mb-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
          Market Unresolved
        </span>
        <p className="mt-2 text-sm text-muted-foreground">
          This market was not resolved by its creator within the grace period.
          You can escalate it to dispute resolution.
        </p>
      </div>

      {isActive ? (
        <EscalateProgress step={step} retryCount={retryCount} />
      ) : step === 'error' ? (
        <div className="mt-4">
          <p className="mb-3 text-center text-sm text-destructive-foreground">
            Escalation failed
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => reset()}
          >
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <Button
            className="w-full bg-amber-500/20 font-semibold text-amber-400 hover:bg-amber-500/30"
            size="lg"
            onClick={handleEscalate}
            disabled={insufficientResolvers}
          >
            Escalate to Dispute
          </Button>
          {insufficientResolvers && (
            <p className="mt-2 text-center text-xs text-amber-400/60">
              Not enough resolvers available ({resolverCount}/7 required)
            </p>
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// ESCALATE PROGRESS INDICATOR
// =============================================================================

function EscalateProgress({
  step,
  retryCount,
}: {
  step: string
  retryCount: number
}) {
  const steps = [
    { key: 'escalating', label: 'Escalating...' },
    { key: 'initializing', label: 'Initializing vote tally...' },
    { key: 'confirming', label: 'Awaiting confirmation...' },
  ]

  if (step === 'checking') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="size-6 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
        <p className="text-center text-sm text-muted-foreground">
          Checking resolver availability...
        </p>
      </div>
    )
  }

  if (step === 'retrying') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="size-6 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
        <p className="text-center text-sm text-muted-foreground">
          Dispute busy -- retrying... (attempt {retryCount})
        </p>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="flex size-8 items-center justify-center rounded-full bg-amber-400/10">
          <svg
            className="size-5 text-amber-400"
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
        <p className="text-center text-sm font-medium text-amber-400">
          Dispute escalated!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 py-6">
      {steps.map((s, i) => {
        const isActive = s.key === step
        const stepIndex = steps.findIndex((ss) => ss.key === step)
        const isDone = i < stepIndex

        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                isDone && 'bg-amber-400/10 text-amber-400',
                isActive && 'bg-amber-400 text-amber-950',
                !isDone && !isActive && 'bg-secondary text-muted-foreground',
              )}
            >
              {isDone ? (
                <svg
                  className="size-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'text-sm',
                isActive && 'font-medium text-foreground',
                isDone && 'text-muted-foreground',
                !isDone && !isActive && 'text-muted-foreground/50',
              )}
            >
              {s.label}
            </span>
            {isActive && (
              <div className="ml-auto size-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// DISPUTE PENDING MODE
// =============================================================================

function DisputePendingMode({
  market,
  dispute,
  connected,
  onOpenWallet,
}: {
  market: OnChainMarket
  dispute: OnChainDispute
  connected: boolean
  onOpenWallet: () => void
}) {
  const finalizeDispute = useFinalizeDispute(market.id)
  const addTiebreaker = useAddTiebreaker(market.id)

  const now = Date.now() / 1000
  const votingExpired = now > dispute.votingEnd
  const quorumReached = dispute.voteCount >= dispute.quorum

  // Tie detection: dispute reset to Voting with votes already cast but no tiebreaker yet
  const isTieDetected =
    dispute.status === 0 &&
    quorumReached &&
    !dispute.tiebreakerAdded

  // Auto-trigger tiebreaker on tie detection
  useEffect(() => {
    if (isTieDetected && connected && !addTiebreaker.isPending) {
      addTiebreaker.mutate()
    }
  }, [isTieDetected, connected])

  // Tie detected state
  if (isTieDetected) {
    return (
      <div className="rounded-xl bg-card p-6">
        <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
          Tie Detected
        </span>
        <p className="mt-3 text-sm text-muted-foreground">
          Tie detected -- selecting tiebreaker juror
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 py-4">
          <div className="size-6 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <p className="text-sm text-muted-foreground">
            {addTiebreaker.isPending
              ? 'Adding tiebreaker juror...'
              : connected
                ? 'Preparing tiebreaker...'
                : 'Connect wallet to add tiebreaker juror'}
          </p>
          {!connected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenWallet}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Quorum reached -- show "Reveal Outcome" button
  if (quorumReached) {
    return (
      <div className="rounded-xl bg-card p-6">
        <div className="mb-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-purple-400">
            Quorum Reached
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            The jury has reached quorum ({dispute.voteCount}/{dispute.quorum} votes).
            Reveal the outcome to determine the verdict.
          </p>
        </div>

        {finalizeDispute.isPending ? (
          <FogOverlay density="heavy" className="rounded-lg">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="size-6 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
              <p className="text-sm text-muted-foreground">
                Revealing outcome...
              </p>
            </div>
          </FogOverlay>
        ) : (
          <Button
            className="w-full bg-purple-500/20 font-semibold text-purple-400 hover:bg-purple-500/30"
            size="lg"
            onClick={() => {
              if (!connected) {
                onOpenWallet()
                return
              }
              finalizeDispute.mutate()
            }}
          >
            Reveal Outcome
          </Button>
        )}
      </div>
    )
  }

  // Voting expired without quorum
  if (votingExpired && !quorumReached) {
    return (
      <div className="rounded-xl bg-card p-6">
        <span className="text-[11px] font-medium uppercase tracking-wider text-purple-400">
          Dispute in Progress
        </span>
        <p className="mt-3 text-sm text-muted-foreground">
          Voting ended -- quorum not reached ({dispute.voteCount}/{dispute.quorum}{' '}
          required)
        </p>
        <div className="mt-4 rounded-lg bg-purple-500/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-300/70">Votes submitted</span>
            <span className="font-mono text-sm tabular-nums text-purple-400">
              {dispute.voteCount}/{dispute.jurors.length}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-purple-300/70">Quorum required</span>
            <span className="font-mono text-sm tabular-nums text-purple-400">
              {dispute.quorum}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Default: voting active, quorum not reached
  return (
    <div className="rounded-xl bg-card p-6">
      <span className="text-[11px] font-medium uppercase tracking-wider text-purple-400">
        Dispute in Progress
      </span>
      <p className="mt-3 text-sm text-muted-foreground">
        Awaiting jury verdict. Votes are encrypted -- no leaning signal is
        available.
      </p>
      <div className="mt-4 rounded-lg bg-purple-500/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-300/70">Votes submitted</span>
          <span className="font-mono text-sm tabular-nums text-purple-400">
            {dispute.voteCount}/{dispute.jurors.length}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-purple-300/70">Quorum required</span>
          <span className="font-mono text-sm tabular-nums text-purple-400">
            {dispute.quorum}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-purple-300/70">Voting ends</span>
          <CountdownTimer
            deadline={new Date(dispute.votingEnd * 1000)}
            className="text-xs text-purple-400"
          />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// DISPUTE FINALIZED MODE
// =============================================================================

function DisputeFinalizedMode({
  market,
  dispute,
}: {
  market: OnChainMarket
  dispute: OnChainDispute
}) {
  const finalizeDispute = useFinalizeDispute(market.id)

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="mb-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-purple-400">
          Dispute Settled
        </span>
        <p className="mt-2 text-sm text-muted-foreground">
          The jury has reached a verdict. Reveal the outcome to enable payouts.
        </p>
      </div>

      {finalizeDispute.isPending ? (
        <FogOverlay density="heavy" className="rounded-lg">
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="size-6 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
            <p className="text-sm text-muted-foreground">
              Revealing outcome...
            </p>
          </div>
        </FogOverlay>
      ) : (
        <Button
          className="w-full bg-purple-500/20 font-semibold text-purple-400 hover:bg-purple-500/30"
          size="lg"
          onClick={() => finalizeDispute.mutate()}
        >
          Reveal Outcome
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// EXPIRED MODE
// =============================================================================

function ExpiredMode() {
  return (
    <div className="rounded-xl bg-card p-6">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Market Expired
      </span>
      <p className="mt-3 text-sm text-muted-foreground">
        The deadline has passed and this market is no longer accepting bets.
      </p>
    </div>
  )
}
