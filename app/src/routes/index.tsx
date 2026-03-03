import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">Avenir</h1>
        <p className="text-lg text-muted-foreground">
          Encrypted prediction markets on Solana
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Markets</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Market cards will appear here
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
