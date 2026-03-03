import { useState, useEffect } from 'react'
import { cn } from '#/lib/utils'

interface CountdownTimerProps {
  deadline: Date
  className?: string
}

function formatRemaining(deadline: Date): string {
  const now = Date.now()
  const diff = deadline.getTime() - now

  if (diff <= 0) return 'Ended'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m ${seconds % 60}s`
}

function isUrgent(deadline: Date): boolean {
  return deadline.getTime() - Date.now() > 0 && deadline.getTime() - Date.now() < 3600_000
}

export function CountdownTimer({ deadline, className }: CountdownTimerProps) {
  const [text, setText] = useState(() => formatRemaining(deadline))
  const [urgent, setUrgent] = useState(() => isUrgent(deadline))

  useEffect(() => {
    const id = setInterval(() => {
      setText(formatRemaining(deadline))
      setUrgent(isUrgent(deadline))
    }, 1000)
    return () => clearInterval(id)
  }, [deadline])

  return (
    <span
      className={cn(
        'text-xs',
        urgent ? 'text-destructive-foreground' : 'text-muted-foreground',
        className,
      )}
    >
      {text}
    </span>
  )
}
