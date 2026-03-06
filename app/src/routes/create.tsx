import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/create')({
  component: CreateMarketPage,
})

function CreateMarketPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-4xl italic leading-tight md:text-5xl">
          Create Market
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Create a new prediction market on Avenir.
        </p>
      </div>
    </div>
  )
}
