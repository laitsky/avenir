import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import { Wallet, Loader2 } from 'lucide-react'
import { useCreateMarket } from '#/hooks/useCreateMarket'
import { useWhitelist } from '#/hooks/useWhitelist'
import { FogOverlay } from '#/components/fog/FogOverlay'
import { useWalletSelector } from '#/components/wallet/WalletSelectorProvider'
import { Button } from '#/components/ui/button'
import { CATEGORY_MAP } from '#/lib/types'

export const Route = createFileRoute('/create')({
  component: CreateMarketPage,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMinDeadline(): string {
  // Current time + 1 hour + 60 seconds buffer
  const minDate = new Date(Date.now() + 3660 * 1000)
  // Format as YYYY-MM-DDTHH:MM for datetime-local input (no seconds)
  const year = minDate.getFullYear()
  const month = String(minDate.getMonth() + 1).padStart(2, '0')
  const day = String(minDate.getDate()).padStart(2, '0')
  const hours = String(minDate.getHours()).padStart(2, '0')
  const minutes = String(minDate.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getButtonText(
  step: string,
  retryCount: number,
): string {
  switch (step) {
    case 'creating':
      return 'Creating...'
    case 'initializing':
      return 'Initializing pool...'
    case 'confirming':
      return 'Confirming...'
    case 'retrying':
      return `Retrying... (${retryCount})`
    case 'success':
      return 'Created!'
    default:
      return 'Create Market'
  }
}

function isActiveStep(step: string): boolean {
  return (
    step === 'creating' ||
    step === 'initializing' ||
    step === 'confirming' ||
    step === 'retrying'
  )
}

// ---------------------------------------------------------------------------
// Form fields component (shared between fog-gated and interactive renders)
// ---------------------------------------------------------------------------

function MarketForm({
  disabled,
  onSubmit,
  step,
  retryCount,
}: {
  disabled: boolean
  onSubmit: (data: {
    question: string
    resolutionSource: string
    category: number
    resolutionTime: number
  }) => void
  step: string
  retryCount: number
}) {
  const [question, setQuestion] = useState('')
  const [resolutionSource, setResolutionSource] = useState('')
  const [category, setCategory] = useState('0')
  const [deadline, setDeadline] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!question.trim()) {
      newErrors.question = 'Question is required'
    }

    if (!resolutionSource.trim()) {
      newErrors.resolutionSource = 'Resolution source is required'
    }

    if (!deadline) {
      newErrors.deadline = 'Deadline is required'
    } else {
      const deadlineSeconds = Math.floor(new Date(deadline).getTime() / 1000)
      const minSeconds = Math.floor(Date.now() / 1000) + 3660
      if (deadlineSeconds <= minSeconds) {
        newErrors.deadline = 'Deadline must be at least 1 hour from now'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    if (!validate()) return

    const deadlineSeconds = Math.floor(new Date(deadline).getTime() / 1000)
    onSubmit({
      question: question.trim(),
      resolutionSource: resolutionSource.trim(),
      category: parseInt(category, 10),
      resolutionTime: deadlineSeconds,
    })
  }

  const inputClassName =
    'w-full rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent/40 focus:outline-none'

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        {/* Question */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will X happen by Y?"
            maxLength={200}
            required
            disabled={disabled}
            className={inputClassName}
          />
          {errors.question && (
            <p className="mt-1 text-[12px] text-destructive">{errors.question}</p>
          )}
        </div>

        {/* Resolution Source */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Resolution Source
          </label>
          <input
            type="text"
            value={resolutionSource}
            onChange={(e) => setResolutionSource(e.target.value)}
            placeholder="e.g., Official announcement from..."
            required
            disabled={disabled}
            className={inputClassName}
          />
          {errors.resolutionSource && (
            <p className="mt-1 text-[12px] text-destructive">
              {errors.resolutionSource}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={disabled}
            className={inputClassName}
          >
            {Object.entries(CATEGORY_MAP).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution Deadline */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Resolution Deadline
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={getMinDeadline()}
            disabled={disabled}
            className={inputClassName}
          />
          {errors.deadline && (
            <p className="mt-1 text-[12px] text-destructive">{errors.deadline}</p>
          )}
        </div>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        size="lg"
        disabled={disabled || (step !== 'idle' && step !== 'error')}
        className="mt-6 w-full"
      >
        {isActiveStep(step) && (
          <Loader2 className="size-4 animate-spin" />
        )}
        {getButtonText(step, retryCount)}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function CreateMarketPage() {
  const { publicKey } = useWallet()
  const { open } = useWalletSelector()
  const { data: isWhitelisted, isLoading } = useWhitelist(publicKey ?? null)
  const navigate = useNavigate()

  const mutation = useCreateMarket()
  const { step, retryCount, newMarketId } = mutation

  // Post-creation redirect
  useEffect(() => {
    if (step === 'success' && newMarketId !== null) {
      void navigate({ to: '/market/$id', params: { id: String(newMarketId) } })
    }
  }, [step, newMarketId, navigate])

  // State 1: No wallet connected
  if (!publicKey) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl italic">Create Market</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new prediction market
        </p>

        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="max-w-xs text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-card">
              <Wallet className="size-6 text-muted-foreground" />
            </div>
            <p className="mb-2 font-serif text-lg italic">No wallet connected</p>
            <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
              Connect your wallet to create markets.
            </p>
            <button
              type="button"
              onClick={open}
              className="cursor-pointer rounded-lg border border-accent/25 bg-accent/5 px-5 py-2.5 text-[13px] font-medium text-accent transition-all hover:border-accent/40 hover:bg-accent/10"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    )
  }

  // State 2: Whitelist loading
  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl italic">Create Market</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new prediction market
        </p>

        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // State 3: Not whitelisted -- fog gate
  if (!isWhitelisted) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl italic">Create Market</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new prediction market
        </p>

        <div className="relative mt-8">
          <FogOverlay density="heavy" className="rounded-xl">
            <div className="pointer-events-none select-none rounded-xl bg-card p-6">
              <MarketForm
                disabled={true}
                onSubmit={() => {}}
                step="idle"
                retryCount={0}
              />
            </div>
          </FogOverlay>

          {/* Access restricted overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-serif text-xl italic text-foreground">
                Access Restricted
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Only whitelisted creators can create markets.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // State 4: Whitelisted -- interactive form
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl italic">Create Market</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set up a new prediction market
      </p>

      <div className="mt-8 rounded-xl bg-card p-6">
        <MarketForm
          disabled={false}
          onSubmit={(data) => mutation.mutate(data)}
          step={step}
          retryCount={retryCount}
        />
      </div>

      {/* Inline retry for partial failure (init_pool failed after market creation) */}
      {step === 'error' && newMarketId !== null && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="mb-3 text-sm text-foreground">
            Market created but pool initialization failed.
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => mutation.mutate(mutation.variables!)}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
