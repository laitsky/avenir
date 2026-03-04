import { createFileRoute } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'

export const Route = createFileRoute('/portfolio')({
  component: Portfolio,
})

function Portfolio() {
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl italic">Portfolio</h1>
      <p className="mb-12 text-sm text-muted-foreground">
        Your positions and betting history
      </p>

      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-xs text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-card">
            <Wallet className="size-6 text-muted-foreground" />
          </div>
          <p className="mb-2 font-serif text-lg italic">No wallet connected</p>
          <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
            Connect your Solana wallet to view active positions, payouts, and
            history.
          </p>
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-5 py-2.5 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  )
}
