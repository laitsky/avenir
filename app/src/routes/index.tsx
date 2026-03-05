import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMarkets } from '#/hooks/useMarkets'
import { MarketGrid } from '#/components/layout/MarketGrid'
import { CategoryTabs } from '#/components/layout/CategoryTabs'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'
import { CATEGORY_MAP, SENTIMENT_MAP } from '#/lib/types'

export const Route = createFileRoute('/')({
  component: HomePage,
})

/**
 * Converts a sentiment enum value to an approximate visual percentage for the bar.
 */
function sentimentToPercent(sentiment: number): number {
  switch (sentiment) {
    case 1: return 65  // Leaning Yes
    case 2: return 50  // Even
    case 3: return 35  // Leaning No
    default: return 50 // Unknown
  }
}

function HomePage() {
  const [category, setCategory] = useState('All')
  const { data: markets, isLoading, error } = useMarkets()

  // Loading state: fog-themed
  if (isLoading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="font-serif text-4xl italic leading-tight md:text-5xl">
            Markets
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Encrypted predictions on Solana. Bets are hidden behind fog until
            markets resolve.
          </p>
        </div>
        <div className="relative flex min-h-[60vh] items-center justify-center">
          <FogOverlay density="heavy">
            <p className="text-lg text-muted-foreground">Loading markets...</p>
          </FogOverlay>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="font-serif text-4xl italic leading-tight md:text-5xl">
            Markets
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Encrypted predictions on Solana. Bets are hidden behind fog until
            markets resolve.
          </p>
        </div>
        <div className="py-20 text-center">
          <p className="text-sm text-destructive-foreground">
            Failed to load markets. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  const allMarkets = markets ?? []

  const filtered =
    category === 'All'
      ? allMarkets
      : allMarkets.filter((m) => CATEGORY_MAP[m.category] === category)

  // Featured: highest bet count among live markets
  const liveMarkets = allMarkets.filter((m) => m.state === 0)
  const featured = liveMarkets.length > 0
    ? liveMarkets.sort((a, b) => b.totalBets - a.totalBets)[0]
    : null

  // Grid excludes the featured market
  const gridMarkets = featured
    ? filtered.filter((m) => m.id !== featured.id)
    : filtered

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <h1 className="font-serif text-4xl italic leading-tight md:text-5xl">
          Markets
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Encrypted predictions on Solana. Bets are hidden behind fog until
          markets resolve.
        </p>
      </div>

      {/* Featured market */}
      {featured && (
        <Link
          to="/market/$id"
          params={{ id: featured.id.toString() }}
          className="no-underline"
        >
          <div className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 transition-all duration-300 hover:to-primary/10">
            {/* Atmospheric glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/5 blur-3xl transition-all duration-500 group-hover:bg-primary/8" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-accent/3 blur-3xl" />

            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  Featured
                </span>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_MAP[featured.category] ?? 'Other'}
                </span>
                <span className="ml-auto">
                  <CountdownTimer deadline={new Date(featured.resolutionTime * 1000)} />
                </span>
              </div>

              <h2 className="mb-3 font-serif text-2xl italic leading-tight md:text-3xl">
                {featured.question}
              </h2>

              <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Source: {featured.resolutionSource}
              </p>

              {/* Probability bar */}
              <div className="mb-5">
                <div className="relative">
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="rounded-full bg-primary/70 transition-all duration-700"
                      style={{ width: `${sentimentToPercent(featured.sentiment)}%` }}
                    />
                  </div>
                  <FogOverlay
                    density="light"
                    className="absolute inset-0 rounded-full"
                  >
                    <div className="h-2.5" />
                  </FogOverlay>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {featured.totalBets} bets
                </span>
                <FogOverlay density="heavy">
                  <span className="font-mono text-xs tabular-nums text-accent">
                    Encrypted
                  </span>
                </FogOverlay>
                <FogOverlay density="light">
                  <span className="text-xs text-muted-foreground">
                    {SENTIMENT_MAP[featured.sentiment] ?? 'Unknown'}
                  </span>
                </FogOverlay>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Empty state when no markets */}
      {allMarkets.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">
            No markets deployed yet. Create the first one!
          </p>
        </div>
      )}

      {/* Tabs + Grid */}
      {allMarkets.length > 0 && (
        <>
          <CategoryTabs value={category} onValueChange={setCategory} />
          <MarketGrid markets={gridMarkets} />
        </>
      )}
    </div>
  )
}
