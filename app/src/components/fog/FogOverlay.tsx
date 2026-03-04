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
    <div className={cn('relative overflow-hidden rounded-[inherit]', className)}>
      {/* Content — fades in after fog clears */}
      <div
        className={cn(
          'transition-all ease-out',
          revealed
            ? 'opacity-100 blur-0 duration-600 delay-200'
            : 'opacity-0 blur-[3px] duration-300'
        )}
      >
        {children}
      </div>

      {/* Fog layers — clear first, content appears second */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-all duration-600 ease-out',
          revealed && 'opacity-0 backdrop-blur-0'
        )}
      >
        {/* Layer 1: tinted blur */}
        <div
          className={cn(
            'absolute inset-0',
            density === 'heavy'
              ? 'bg-fog-heavy backdrop-blur-md'
              : 'bg-fog-light backdrop-blur-sm'
          )}
        />

        {/* Layer 2: dual drifting gradients — opposing directions for organic movement */}
        {!revealed && (
          <>
            <div
              className={cn(
                'absolute inset-0 bg-[length:200%_200%] motion-safe:animate-fog-drift',
                density === 'heavy'
                  ? 'bg-gradient-to-br from-emerald/12 via-transparent to-emerald/8'
                  : 'bg-gradient-to-r from-emerald/6 via-transparent to-emerald/4'
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-emerald/3 to-transparent bg-[length:300%_300%] motion-safe:animate-fog-drift [animation-direction:reverse] [animation-duration:18s]" />
          </>
        )}

        {/* Layer 3: edge vignette — grounds fog into the surface */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/15 via-transparent to-transparent" />
      </div>
    </div>
  )
}
