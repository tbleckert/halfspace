import { cn } from '@/lib/utils'

export function entitySubpageNavigationItemClassName(
  active: boolean,
  indicator: 'top' | 'bottom' = 'bottom',
  className?: string
): string {
  return cn(
    'relative shrink-0 px-0.5 pb-3 text-sm font-medium outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring',
    className,
    active
      ? cn(
          'font-semibold text-foreground',
          indicator === 'top'
            ? 'before:absolute before:inset-x-0 before:-top-px before:z-10 before:h-0.5 before:bg-current before:content-[""]'
            : 'after:absolute after:inset-x-0 after:-bottom-px after:z-10 after:h-0.5 after:bg-current after:content-[""]'
        )
      : 'text-muted-foreground hover:text-foreground'
  )
}
