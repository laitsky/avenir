import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/portfolio')({
  component: Portfolio,
})

function Portfolio() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">
          Your prediction market positions
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Connect your wallet to view positions
        </p>
      </section>
    </div>
  )
}
