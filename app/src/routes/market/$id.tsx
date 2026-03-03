import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/market/$id')({
  component: MarketDetail,
})

function MarketDetail() {
  const { id } = Route.useParams()

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">Market #{id}</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Market Question Placeholder
        </h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Sentiment</h2>
            <p className="text-sm text-muted-foreground">
              Encrypted sentiment data will appear here
            </p>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Place Bet</h2>
            <p className="text-sm text-muted-foreground">
              Bet placement form will appear here
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
