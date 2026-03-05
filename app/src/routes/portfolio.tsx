import { createFileRoute, Link } from '@tanstack/react-router'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Wallet, Loader2 } from 'lucide-react'
import { useUserPositions, type EnrichedPosition } from '#/hooks/useUserPositions'
import { useClaimPayout } from '#/hooks/useClaimPayout'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import { Button } from '#/components/ui/button'
import { CATEGORY_MAP } from '#/lib/types'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/portfolio')({
  component: Portfolio,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CategorizedPositions {
  active: EnrichedPosition[]
  claimable: EnrichedPosition[]
  history: EnrichedPosition[]
}

function categorizePositions(positions: EnrichedPosition[]): CategorizedPositions {
  const active: EnrichedPosition[] = []
  const claimable: EnrichedPosition[] = []
  const history: EnrichedPosition[] = []

  for (const ep of positions) {
    const { position, market } = ep

    if (!market) {
      // No market data loaded yet — safe default to active
      active.push(ep)
      continue
    }

    if (market.state === 4) {
      // Finalized market
      const wonYes = market.winningOutcome === 1 && position.yesAmount > 0
      const wonNo = market.winningOutcome === 2 && position.noAmount > 0
      const isWinner = wonYes || wonNo

      if (isWinner && !position.claimed) {
        claimable.push(ep)
      } else {
        // claimed=true OR loser
        history.push(ep)
      }
    } else {
      // Open (0), Locked (1), Resolved (2), Disputed (3) — all active
      active.push(ep)
    }
  }

  // Sort history by resolutionTime descending (most recent first)
  history.sort((a, b) => {
    const ta = a.market?.resolutionTime ?? 0
    const tb = b.market?.resolutionTime ?? 0
    return tb - ta
  })

  return { active, claimable, history }
}

function formatUsdc(lamports: number): string {
  return (lamports / 1_000_000).toFixed(2)
}

function getUserSide(position: EnrichedPosition['position']): string {
  if (position.yesAmount > 0 && position.noAmount > 0) return 'Yes & No'
  if (position.yesAmount > 0) return 'Yes'
  if (position.noAmount > 0) return 'No'
  return 'Unknown'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryBar({ positions }: { positions: EnrichedPosition[] }) {
  const { active } = categorizePositions(positions)

  const totalStaked = active.reduce(
    (sum, ep) => sum + ep.position.yesAmount + ep.position.noAmount,
    0,
  )

  const claimed = positions.filter((ep) => ep.position.claimed)
  const winningsClaimed = claimed.reduce(
    (sum, ep) => sum + ep.position.yesAmount + ep.position.noAmount,
    0,
  )

  return (
    <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[
        { label: 'Active Positions', value: String(active.length) },
        { label: 'Total Staked', value: `${formatUsdc(totalStaked)} USDC` },
        { label: 'Winnings Claimed', value: `${formatUsdc(winningsClaimed)} USDC` },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-card p-4">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-mono text-lg">{value}</p>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string
  count: number
  accent?: boolean
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <h2
        className={cn(
          'font-serif text-xl italic',
          accent && 'text-accent',
        )}
      >
        {title}
      </h2>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          accent
            ? 'bg-accent/10 text-accent'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </div>
  )
}

function ActivePositionCard({ ep }: { ep: EnrichedPosition }) {
  const { position, market } = ep
  const staked = position.yesAmount + position.noAmount
  const side = getUserSide(position)

  return (
    <div className="rounded-xl bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {market ? CATEGORY_MAP[market.category] ?? 'Unknown' : 'Unknown'}
        </span>
        {market && market.state !== 2 && (
          <CountdownTimer
            deadline={new Date(market.resolutionTime * 1000)}
          />
        )}
        {market && (
          <span className="text-[11px] text-muted-foreground">
            {market.state === 0
              ? 'Open'
              : market.state === 1
                ? 'Locked'
                : market.state === 2
                  ? 'Resolved'
                  : market.state === 3
                    ? 'Disputed'
                    : 'Finalized'}
          </span>
        )}
      </div>

      {market ? (
        <Link
          to="/market/$id"
          params={{ id: String(market.id) }}
          className="block"
        >
          <p className="mb-3 line-clamp-2 font-serif text-lg italic leading-snug hover:text-accent transition-colors">
            {market.question}
          </p>
        </Link>
      ) : (
        <p className="mb-3 line-clamp-2 font-serif text-lg italic leading-snug text-muted-foreground">
          Loading market...
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-muted-foreground">
          {formatUsdc(staked)} USDC on{' '}
          <span className={cn(
            'font-semibold',
            side === 'Yes' ? 'text-emerald-400' : side === 'No' ? 'text-red-400' : 'text-foreground',
          )}>
            {side}
          </span>
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Payout:</span>
          <FogOverlay density="heavy" className="rounded-md">
            <span className="px-2 py-0.5 font-mono text-xs">Encrypted</span>
          </FogOverlay>
        </div>
      </div>
    </div>
  )
}

function ClaimablePositionCard({ ep }: { ep: EnrichedPosition }) {
  const { position, market } = ep
  const claimMutation = useClaimPayout(market!.id)

  const winningOutcome = market!.winningOutcome
  const revealedYesPool = market!.revealedYesPool
  const revealedNoPool = market!.revealedNoPool
  const totalPool = revealedYesPool + revealedNoPool
  const winningPool =
    winningOutcome === 1 ? revealedYesPool : revealedNoPool
  const userWinning =
    winningOutcome === 1 ? position.yesAmount : position.noAmount

  // Estimate payout: (userWinning / winningPool) * totalPool * (1 - 0.02)
  const estimatedPayout =
    winningPool > 0
      ? (userWinning / winningPool) * totalPool * 0.98
      : userWinning

  const outcomeSide = winningOutcome === 1 ? 'Yes' : 'No'

  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-accent/20">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
          Won - {outcomeSide}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {CATEGORY_MAP[market!.category] ?? 'Unknown'}
        </span>
      </div>

      <p className="mb-4 line-clamp-1 font-serif text-base italic leading-snug">
        {market!.question}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-sm text-accent">
          ~{formatUsdc(estimatedPayout)} USDC
        </p>

        <Button
          size="lg"
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
          className="w-full min-h-[44px] sm:w-auto sm:shrink-0"
        >
          {claimMutation.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Claiming...
            </>
          ) : (
            'Claim'
          )}
        </Button>
      </div>
    </div>
  )
}

function HistoryPositionCard({ ep }: { ep: EnrichedPosition }) {
  const { position, market } = ep
  const staked = position.yesAmount + position.noAmount
  const winningOutcome = market?.winningOutcome ?? 0
  const isClaimed = position.claimed

  // Determine if this is a win (claimed) or loss
  const wonYes = winningOutcome === 1 && position.yesAmount > 0
  const wonNo = winningOutcome === 2 && position.noAmount > 0
  const isWin = wonYes || wonNo
  const side = getUserSide(position)

  return (
    <div
      className={cn(
        'rounded-xl bg-card p-5',
        !isWin && 'opacity-60',
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {isClaimed && isWin ? (
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            Claimed
          </span>
        ) : (
          <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive-foreground">
            Lost
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">
          {market ? CATEGORY_MAP[market.category] ?? 'Unknown' : 'Unknown'}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 font-serif text-base italic leading-snug">
        {market?.question ?? 'Unknown market'}
      </p>

      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-muted-foreground">
          {formatUsdc(staked)} USDC on{' '}
          <span className={cn(
            side === 'Yes' ? 'text-emerald-400' : side === 'No' ? 'text-red-400' : '',
          )}>
            {side}
          </span>
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function Portfolio() {
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { data: positions, isLoading } = useUserPositions()

  // Wallet disconnected state
  if (!publicKey) {
    return (
      <div>
        <h1 className="mb-2 font-serif text-3xl italic">Portfolio</h1>
        <p className="mb-12 text-sm text-muted-foreground">
          Your positions and betting history
        </p>

        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="max-w-xs text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-card">
              <Wallet className="size-6 text-muted-foreground" />
            </div>
            <p className="mb-2 font-serif text-lg italic">No wallet connected</p>
            <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
              Connect your Solana wallet to view active positions, payouts, and
              history.
            </p>
            <button
              type="button"
              onClick={() => setVisible(true)}
              className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-5 py-2.5 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div>
        <h1 className="mb-2 font-serif text-3xl italic">Portfolio</h1>
        <p className="mb-12 text-sm text-muted-foreground">
          Your positions and betting history
        </p>

        <div className="flex min-h-[50vh] items-center justify-center">
          <FogOverlay density="heavy" className="rounded-xl">
            <p className="px-8 py-6 font-mono text-sm text-muted-foreground">
              Loading portfolio...
            </p>
          </FogOverlay>
        </div>
      </div>
    )
  }

  const allPositions = positions ?? []
  const { active, claimable, history } = categorizePositions(allPositions)
  const hasAny = allPositions.length > 0

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl italic">Portfolio</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Your positions and betting history
      </p>

      {/* No positions at all */}
      {!hasAny && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="max-w-xs text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-card">
              <Wallet className="size-6 text-muted-foreground" />
            </div>
            <p className="mb-2 font-serif text-lg italic">No bets yet</p>
            <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
              You haven't placed any bets yet. Browse markets and place your
              first bet.
            </p>
            <Link
              to="/"
              className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-5 py-2.5 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
            >
              Browse Markets
            </Link>
          </div>
        </div>
      )}

      {hasAny && (
        <>
          <SummaryBar positions={allPositions} />

          {/* All caught up banner */}
          {active.length === 0 && claimable.length === 0 && history.length > 0 && (
            <div className="mb-8 rounded-xl border border-accent/10 bg-accent/5 px-5 py-3 text-sm text-muted-foreground">
              All caught up —{' '}
              <Link to="/" className="text-accent underline-offset-2 hover:underline">
                find new markets to bet on
              </Link>
            </div>
          )}

          {/* Active section */}
          {active.length > 0 && (
            <section className="mb-10">
              <SectionHeader title="Active" count={active.length} />
              <div className="flex flex-col gap-3">
                {active.map((ep) => (
                  <ActivePositionCard
                    key={ep.position.publicKey.toBase58()}
                    ep={ep}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Claimable section */}
          {claimable.length > 0 && (
            <section className="mb-10">
              <SectionHeader
                title="Claimable"
                count={claimable.length}
                accent
              />
              <div className="flex flex-col gap-3">
                {claimable.map((ep) => (
                  <ClaimablePositionCard
                    key={ep.position.publicKey.toBase58()}
                    ep={ep}
                  />
                ))}
              </div>
            </section>
          )}

          {/* History section */}
          {history.length > 0 && (
            <section className="mb-10">
              <SectionHeader title="History" count={history.length} />
              <div className="flex flex-col gap-3">
                {history.map((ep) => (
                  <HistoryPositionCard
                    key={ep.position.publicKey.toBase58()}
                    ep={ep}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
