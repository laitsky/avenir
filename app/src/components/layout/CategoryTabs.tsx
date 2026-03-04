import { cn } from '#/lib/utils'

const CATEGORIES = [
  'All',
  'Crypto',
  'Politics',
  'Sports',
  'Culture',
  'Economics',
] as const

interface CategoryTabsProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function CategoryTabs({
  value,
  onValueChange,
  className,
}: CategoryTabsProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto', className)}>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onValueChange(category)}
          className={cn(
            'cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all',
            value === category
              ? 'bg-primary/15 text-primary ring-1 ring-primary/20'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
