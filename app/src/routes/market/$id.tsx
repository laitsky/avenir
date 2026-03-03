import { createFileRoute, Link } from '@tanstack/react-router'
import { MOCK_MARKETS } from '#/lib/mock-data'
import { MarketDetail } from '#/components/market/MarketDetail'
import { BetPlacement } from '#/components/market/BetPlacement'

export const Route = createFileRoute('/market/$id')({
  component: MarketDetailPage,
})

function MarketDetailPage() {
  const { id } = Route.useParams()
  const market = MOCK_MARKETS.find((m) => m.id === id) ?? MOCK_MARKETS[0]

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Markets
      </Link>

      {/* Sidebar layout: info left, bet form sticky right */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MarketDetail market={market} />
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BetPlacement market={market} />
        </aside>
      </div>
    </div>
  )
}
