import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { addDaysToIsoDate } from '@/lib/date'

export function WeekNavigator({
  date,
  navigationDates,
  onSelect,
  label = 'Matchday week'
}: {
  label?: string
  date: string
  navigationDates: string[]
  onSelect: (date: string) => void
}): React.JSX.Element {
  return (
    <nav aria-label={label} className="mx-auto flex w-full max-w-lg items-center gap-1">
      <Button
        aria-label="Previous week"
        className="size-7 text-muted-foreground"
        size="icon"
        variant="ghost"
        onClick={() => onSelect(addDaysToIsoDate(date, -7))}
      >
        <ChevronLeft className="size-3.5" />
      </Button>

      <div className="grid min-w-0 flex-1 grid-cols-7">
        {navigationDates.map((navigationDate) => {
          const active = navigationDate === date
          const outsideSelectedMonth = navigationDate.slice(0, 7) !== date.slice(0, 7)

          return (
            <button
              key={navigationDate}
              aria-current={active ? 'date' : undefined}
              aria-label={formatNavigationDate(navigationDate)}
              className={cn(
                'flex min-w-0 flex-col items-center rounded-md px-1 py-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                outsideSelectedMonth && 'text-muted-foreground/55',
                active && 'text-foreground'
              )}
              type="button"
              onClick={() => onSelect(navigationDate)}
            >
              <span className={cn('text-xs', active && 'font-medium')}>
                {formatWeekday(navigationDate)}
              </span>
              <span className={cn('text-sm tabular-nums', active && 'font-semibold')}>
                {navigationDate.slice(-2)}
              </span>
            </button>
          )
        })}
      </div>

      <Button
        aria-label="Next week"
        className="size-7 text-muted-foreground"
        size="icon"
        variant="ghost"
        onClick={() => onSelect(addDaysToIsoDate(date, 7))}
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </nav>
  )
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  )
}
function formatNavigationDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`))
}
