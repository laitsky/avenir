import { Tabs } from 'radix-ui'
import { cn } from '#/lib/utils'

const CATEGORIES = ['All', 'Politics', 'Crypto', 'Sports', 'Culture', 'Economics'] as const

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
    <Tabs.Root value={value} onValueChange={onValueChange}>
      <Tabs.List className={cn('flex gap-1', className)}>
        {CATEGORIES.map((category) => (
          <Tabs.Trigger
            key={category}
            value={category}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            {category}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  )
}
