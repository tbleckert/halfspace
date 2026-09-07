import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
export function FixtureDatePicker({
  date,
  today,
  onSelect
}: {
  date: string
  today: string
  onSelect: (date: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)

  function selectDate(nextDate: Date | undefined): void {
    if (!nextDate) return

    onSelect(calendarDateValue(nextDate))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Choose fixture date, ${weekDateAriaLabel(date)}`}
            size="icon"
            variant="ghost"
          />
        }
      >
        <CalendarDays className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-0 p-0" initialFocus>
        <PopoverTitle className="sr-only">Choose fixture date</PopoverTitle>
        <Calendar
          autoFocus
          defaultMonth={calendarDate(date)}
          mode="single"
          selected={calendarDate(date)}
          today={calendarDate(today)}
          onSelect={selectDate}
        />
        {date !== today && (
          <div className="border-t p-2">
            <Button
              className="w-full"
              size="sm"
              variant="ghost"
              onClick={() => selectDate(calendarDate(today))}
            >
              Today
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function calendarDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function calendarDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function weekDateAriaLabel(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(isoDateValue(date))
}

function isoDateValue(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}
