import { createFileRoute, Link } from '@tanstack/react-router'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { MarketDetail } from '#/components/market/MarketDetail'
import { BetPlacement } from '#/components/market/BetPlacement'
import { useMarket } from '#/hooks/useMarket'
import { useUserPosition } from '#/hooks/useUserPosition'
import { useDisputeData } from '#/hooks/useDisputeData'

export const Route = createFileRoute('/market/$id')({
  component: MarketDetailPage,
})

function MarketDetailPage() {
  const { id } = Route.useParams()
  const marketId = parseInt(id, 10)
  const { data: market, isLoading, isError } = useMarket(marketId)
  const { data: position } = useUserPosition(marketId)
  const { dispute } = useDisputeData(marketId)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FogOverlay density="heavy">
          <div className="px-12 py-8">
            <p className="text-center font-serif text-lg italic text-muted-foreground">
              Loading market...
            </p>
          </div>
        </FogOverlay>
      </div>
    )
  }

  if (isError || !market) {
    return (
      <div>
        <Link
          to="/"
          className="mb-10 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Markets
        </Link>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-center text-muted-foreground">
            Market not found or failed to load.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/"
        className="mb-10 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Markets
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Main content with bottom padding on mobile to avoid overlap with fixed bet bar */}
        <div className="pb-[220px] lg:pb-0">
          <MarketDetail market={market} dispute={dispute} />
        </div>

        {/* BetPlacement: fixed bottom bar on mobile, sticky sidebar on lg+ */}
        <aside className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background p-4 lg:relative lg:border-0 lg:bg-transparent lg:p-0 lg:sticky lg:top-28 lg:self-start">
          <BetPlacement market={market} position={position ?? null} dispute={dispute} />
        </aside>
      </div>
    </div>
  )
}
