import { createFileRoute } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/portfolio')({
  component: Portfolio,
})

function Portfolio() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your positions and betting history
        </p>
      </div>

      {/* Wallet connection prompt */}
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto max-w-sm space-y-4">
          <Wallet className="mx-auto size-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Connect Your Wallet</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Solana wallet to view your active positions, potential
            payouts, and betting history.
          </p>
          <Button variant="outline">Connect Wallet</Button>
        </div>
      </div>

      {/* Active positions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Active Positions</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-center text-sm text-muted-foreground">
            No active positions yet
          </p>
        </div>
      </section>

      {/* Resolved bets */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Resolved Bets</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-center text-sm text-muted-foreground">
            No resolved bets yet
          </p>
        </div>
      </section>
    </div>
  )
}
