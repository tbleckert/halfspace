import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { WeekNavigator } from '@/components/week-navigator'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { useCompetitions } from '@/features/competitions/use-competitions'
import { currentTimeZone } from '@/lib/date'
import { useTodayInTimeZone } from '@/lib/use-today'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { matchdayWindow } from './matchday-hub'
import { useFixtures } from './use-fixtures'
import { FixtureDatePicker } from './fixture-date-picker'
import { FixtureGroups, FixtureListSkeleton } from './fixture-list'

export function FixturesPage({ date }: { date: string }): React.JSX.Element {
  const navigate = useNavigate({ from: '/fixtures/' })
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useTodayInTimeZone(timeZone)
  const online = useOnline()
  const { cached, refreshing, error, refresh } = useFixtures(date, timeZone, true)
  const { cached: catalog } = useCompetitions(false)
  const logos = useMemo(
    () =>
      new Map(
        (catalog?.competitions ?? []).map((competition) => [competition.id, competition.imagePath])
      ),
    [catalog]
  )
  function selectDate(value: string): void {
    void navigate({ search: { date: value }, replace: true })
  }
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-8 pt-5 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Fixtures</h1>
      <header className="flex flex-wrap items-center gap-4">
        <div className="min-w-72 flex-1">
          <WeekNavigator
            label="Fixture week"
            date={date}
            navigationDates={matchdayWindow(date).navigationDates}
            onSelect={selectDate}
          />
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-card p-0.5">
          <FixtureDatePicker date={date} today={today} onSelect={selectDate} />
          <Button
            aria-label="Refresh fixtures"
            size="icon"
            variant="ghost"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </header>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {!cached || (!cached.query && refreshing) ? (
        <FixtureListSkeleton />
      ) : cached.fixtures.length ? (
        <FixtureGroups
          date={date}
          fixtures={cached.fixtures}
          competitionImagePaths={logos}
          online={online}
        />
      ) : (
        <p className="py-2 text-sm text-muted-foreground">No fixtures on this date.</p>
      )}
    </div>
  )
}
