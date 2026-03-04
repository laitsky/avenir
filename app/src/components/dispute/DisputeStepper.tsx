import { cn } from '#/lib/utils'
import type { OnChainDispute } from '#/lib/types'

interface DisputeStepperProps {
  dispute: OnChainDispute
}

interface Step {
  label: string
  description: string
}

const STEPS: Step[] = [
  { label: 'Escalated', description: 'Dispute filed' },
  { label: 'Voting', description: 'Jury deliberation' },
  { label: 'Finalized', description: 'Outcome revealed' },
]

/**
 * Horizontal stepper showing dispute progression:
 * Step 1: Escalated (always complete if dispute exists)
 * Step 2: Voting (active during status=0, complete after)
 * Step 3: Finalized (active during status=1, complete when status=2)
 */
export function DisputeStepper({ dispute }: DisputeStepperProps) {
  // dispute.status: 0=Voting, 1=Finalizing, 2=Settled
  // Map to active step index: Escalated is step 0, Voting is step 1, Finalized is step 2
  const activeStepIndex =
    dispute.status === 0 ? 1 : dispute.status === 1 ? 2 : 3

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isComplete = i < activeStepIndex
        const isActive = i === activeStepIndex
        const isLast = i === STEPS.length - 1

        return (
          <div key={step.label} className="flex items-center">
            {/* Step node */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isComplete && 'bg-purple-500/20 text-purple-400',
                  isActive && 'bg-purple-500 text-white',
                  !isComplete && !isActive && 'bg-secondary text-muted-foreground/50',
                )}
              >
                {isComplete ? (
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-[10px] font-medium uppercase tracking-wider',
                  isComplete && 'text-purple-400/70',
                  isActive && 'text-purple-400',
                  !isComplete && !isActive && 'text-muted-foreground/40',
                )}
              >
                {step.label}
              </span>
              {/* Show vote count under Voting step */}
              {i === 1 && (
                <span className="mt-0.5 font-mono text-[9px] tabular-nums text-purple-400/50">
                  {dispute.voteCount}/{dispute.jurors.length} votes
                </span>
              )}
            </div>

            {/* Connector line between steps */}
            {!isLast && (
              <div
                className={cn(
                  'mx-2 h-px w-8 sm:w-12',
                  i < activeStepIndex - 1
                    ? 'bg-purple-500/40'
                    : 'bg-secondary',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
