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
    <div>
      <Link
        to="/"
        className="mb-10 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Markets
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <MarketDetail market={market} />
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <BetPlacement market={market} />
        </aside>
      </div>
    </div>
  )
}
