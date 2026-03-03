import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MarketCard } from '#/components/market/MarketCard'
import { cn } from '#/lib/utils'
import type { MockMarket } from '#/lib/mock-data'

type SortMode = 'trending' | 'newest' | 'ending'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'ending', label: 'Ending Soon' },
]

function sortMarkets(markets: MockMarket[], mode: SortMode): MockMarket[] {
  const sorted = [...markets]
  switch (mode) {
    case 'trending':
      return sorted.sort((a, b) => b.betCount - a.betCount)
    case 'newest':
      return sorted.sort(
        (a, b) => b.deadline.getTime() - a.deadline.getTime(),
      )
    case 'ending': {
      const live = sorted
        .filter((m) => m.status === 'live')
        .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
      const resolved = sorted.filter((m) => m.status !== 'live')
      return [...live, ...resolved]
    }
  }
}

interface MarketGridProps {
  markets: MockMarket[]
  className?: string
}

export function MarketGrid({ markets, className }: MarketGridProps) {
  const [sort, setSort] = useState<SortMode>('trending')
  const sortedMarkets = sortMarkets(markets, sort)

  if (markets.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No markets found
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sorting controls */}
      <div className="flex items-center gap-2">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSort(option.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition-colors',
              sort === option.value
                ? 'bg-sage/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Market card grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedMarkets.map((market) => (
          <Link
            key={market.id}
            to="/market/$id"
            params={{ id: market.id }}
            className="no-underline"
          >
            <MarketCard market={market} />
          </Link>
        ))}
      </div>
    </div>
  )
}
