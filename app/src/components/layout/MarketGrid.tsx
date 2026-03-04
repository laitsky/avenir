import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MarketCard } from '#/components/market/MarketCard'
import { cn } from '#/lib/utils'
import type { OnChainMarket } from '#/lib/types'

type SortMode = 'trending' | 'newest' | 'ending'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'ending', label: 'Ending soon' },
]

function sortMarkets(markets: OnChainMarket[], mode: SortMode): OnChainMarket[] {
  const sorted = [...markets]
  switch (mode) {
    case 'trending':
      return sorted.sort((a, b) => b.totalBets - a.totalBets)
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'ending': {
      const live = sorted
        .filter((m) => m.state === 0 || m.state === 1)
        .sort((a, b) => a.resolutionTime - b.resolutionTime)
      const resolved = sorted.filter((m) => m.state !== 0 && m.state !== 1)
      return [...live, ...resolved]
    }
  }
}

interface MarketGridProps {
  markets: OnChainMarket[]
  className?: string
}

export function MarketGrid({ markets, className }: MarketGridProps) {
  const [sort, setSort] = useState<SortMode>('trending')
  const sorted = sortMarkets(markets, sort)

  if (markets.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        No markets in this category yet.
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-4 text-[13px]">
        <span className="text-muted-foreground/50">Sort</span>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSort(option.value)}
            className={cn(
              'cursor-pointer transition-colors',
              sort === option.value
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/70'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((market, i) => (
          <Link
            key={market.id}
            to="/market/$id"
            params={{ id: market.id.toString() }}
            className="no-underline"
          >
            <MarketCard
              market={market}
              style={{ animationDelay: `${i * 60}ms` }}
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
