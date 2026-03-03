import { cn } from '#/lib/utils'

interface FogOverlayProps {
  density: 'heavy' | 'light'
  revealed?: boolean
  children: React.ReactNode
  className?: string
}

export function FogOverlay({
  density,
  revealed = false,
  children,
  className,
}: FogOverlayProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Content layer */}
      <div
        className={cn(
          'transition-opacity duration-700 ease-out',
          revealed ? 'opacity-100' : 'opacity-0'
        )}
      >
        {children}
      </div>

      {/* Fog overlay layer */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-700 ease-out',
          density === 'heavy'
            ? 'backdrop-blur-md bg-fog-heavy'
            : 'backdrop-blur-sm bg-fog-light',
          revealed && 'opacity-0 backdrop-blur-none pointer-events-none'
        )}
      >
        {/* Fog drift inner layer */}
        {!revealed && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald/20 via-transparent to-sage/15 bg-[length:200%_200%] motion-safe:animate-fog-drift"
          />
        )}
      </div>
    </div>
  )
}
