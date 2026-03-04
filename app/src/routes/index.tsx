import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { MOCK_MARKETS } from '#/lib/mock-data'
import { MarketGrid } from '#/components/layout/MarketGrid'
import { CategoryTabs } from '#/components/layout/CategoryTabs'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { CountdownTimer } from '#/components/market/CountdownTimer'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [category, setCategory] = useState('All')

  const filtered =
    category === 'All'
      ? MOCK_MARKETS
      : MOCK_MARKETS.filter((m) => m.category === category)

  // Featured: highest bet count among live markets
  const featured = MOCK_MARKETS.filter((m) => m.status === 'live').sort(
    (a, b) => b.betCount - a.betCount
  )[0]

  // Grid excludes the featured market
  const gridMarkets = filtered.filter((m) => m.id !== featured.id)

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
      <Link
        to="/market/$id"
        params={{ id: featured.id }}
        className="no-underline"
      >
        <div className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 p-8 transition-all duration-300 hover:to-primary/10">
          {/* Atmospheric glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/5 blur-3xl transition-all duration-500 group-hover:bg-primary/8" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-accent/3 blur-3xl" />

          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                Featured
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {featured.category}
              </span>
              <span className="ml-auto">
                <CountdownTimer deadline={featured.deadline} />
              </span>
            </div>

            <h2 className="mb-3 font-serif text-2xl italic leading-tight md:text-3xl">
              {featured.question}
            </h2>

            <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {featured.description}
            </p>

            {/* Probability bar */}
            <div className="mb-5">
              <div className="relative">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="rounded-full bg-primary/70 transition-all duration-700"
                    style={{ width: `${featured.yesPercent}%` }}
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
            <div className="flex items-center gap-6">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {featured.betCount} bets
              </span>
              <FogOverlay density="heavy">
                <span className="font-mono text-xs tabular-nums text-accent">
                  {featured.poolTotal}
                </span>
              </FogOverlay>
            </div>
          </div>
        </div>
      </Link>

      {/* Tabs + Grid */}
      <CategoryTabs value={category} onValueChange={setCategory} />

      <MarketGrid markets={gridMarkets} />
    </div>
  )
}
