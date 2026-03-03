import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { MOCK_MARKETS } from '#/lib/mock-data'
import { MarketGrid } from '#/components/layout/MarketGrid'
import { CategoryTabs } from '#/components/layout/CategoryTabs'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [category, setCategory] = useState('All')

  const filteredMarkets =
    category === 'All'
      ? MOCK_MARKETS
      : MOCK_MARKETS.filter((m) => m.category === category)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Encrypted prediction markets on Solana
      </p>

      <CategoryTabs value={category} onValueChange={setCategory} />

      <MarketGrid markets={filteredMarkets} />
    </div>
  )
}
