import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import type { CachedFixture, FixtureQuery } from '@/data/db'
import { useMatchdayWindow } from './use-fixtures'
import { buildMatchdaySections, type MatchdayFixturesDay } from './matchday-hub'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { useCompetitions } from '@/features/competitions/use-competitions'
import { cn } from '@/lib/utils'
import { currentTimeZone } from '@/lib/date'
import { useTodayInTimeZone } from '@/lib/use-today'
import { useOnline } from '@/lib/use-online'
import { MatchdayNews } from '@/features/news/matchday-news'
import { MatchdayCard, MatchdayMotion } from './matchday-card'
import { FixtureGroups, FixtureRow, FixtureListSkeleton } from './fixture-list'
import { FeaturedGame } from './featured-game'

const fixtureDayPreviewLimit = 8

export function MatchdayPage(): React.JSX.Element {
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useTodayInTimeZone(timeZone)
  const date = today
  const online = useOnline()
  const { cached, refreshing, error, refresh } = useMatchdayWindow(date, timeZone, true)
  const { cached: competitionCatalog } = useCompetitions(false)
  const sections = useMemo(
    () => buildMatchdaySections(cached?.days ?? [], date, today),
    [cached?.days, date, today]
  )
  const competitionImagePaths = useMemo(
    () =>
      new Map(
        (competitionCatalog?.competitions ?? []).map((competition) => [
          competition.id,
          competition.imagePath
        ])
      ),
    [competitionCatalog?.competitions]
  )

  return (
    <MatchdayMotion>
      <div className="grid min-h-full min-w-0 items-start min-[1120px]:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 px-6 pb-6 pt-3 lg:px-8 lg:pb-8">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Matchday</h1>
              <p className="mt-1 text-sm text-muted-foreground">{weekDateAriaLabel(today)}</p>
            </div>
            <Button
              aria-label="Refresh fixtures"
              disabled={refreshing}
              size="icon"
              variant="ghost"
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            </Button>
          </header>

          {error && <ErrorAlert>{error}</ErrorAlert>}

          {cached === undefined ||
          (!cached.complete && refreshing && !hasAnyCachedDay(cached.days)) ? (
            <FixtureListSkeleton />
          ) : (
            <div className="flex flex-col gap-7">
              <FeaturedGame
                date={today}
                timeZone={timeZone}
                fixtures={[...sections.live, ...sections.selected]}
                complete={!!cached?.days.find((day) => day.date === today)?.query}
                online={online}
              />
              {sections.live.length > 0 && (
                <FixtureSection title="Live now">
                  <FixtureGroups
                    competitionImagePaths={competitionImagePaths}
                    date={date}
                    fixtures={sections.live}
                    online={online}
                  />
                </FixtureSection>
              )}

              {(sections.selected.length > 0 || sections.live.length === 0) && (
                <FixtureSection title={formatHubDate(date, today)}>
                  {sections.selected.length > 0 ? (
                    <FixtureGroups
                      competitionImagePaths={competitionImagePaths}
                      date={date}
                      fixtures={sections.selected}
                      online={online}
                    />
                  ) : (
                    <p className="py-2 text-sm text-muted-foreground">
                      {emptyDateLabel(date, today)}
                    </p>
                  )}
                </FixtureSection>
              )}

              <UpcomingFixtures days={cached?.days ?? []} today={today} online={online} />

              {sections.earlier.length > 0 && (
                <FixtureDayCollection
                  competitionImagePaths={competitionImagePaths}
                  days={sections.earlier}
                  online={online}
                  title={date === today ? 'Latest results' : 'Earlier'}
                  today={today}
                />
              )}
            </div>
          )}
        </div>
        <MatchdayNews online={online} />
      </div>
    </MatchdayMotion>
  )
}

function FixtureSection({
  children,
  title
}: {
  children: React.ReactNode
  title: string
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function FixtureDayCollection({
  competitionImagePaths,
  days,
  online,
  title,
  today
}: {
  competitionImagePaths: Map<number, string | null>
  days: MatchdayFixturesDay[]
  online: boolean
  title: string
  today: string
}): React.JSX.Element {
  return (
    <FixtureSection title={title}>
      <div className="space-y-5">
        {days.map((day) => (
          <div key={day.date} className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {formatHubDate(day.date, today)}
              </h3>
              {day.fixtures.length > fixtureDayPreviewLimit && (
                <Link
                  to="/fixtures"
                  search={{ date: day.date }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-sidebar-primary outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  View all {day.fixtures.length}
                </Link>
              )}
            </div>
            <FixtureGroups
              competitionImagePaths={competitionImagePaths}
              date={day.date}
              fixtures={fixtureDayPreview(day.fixtures)}
              online={online}
            />
          </div>
        ))}
      </div>
    </FixtureSection>
  )
}

function hasAnyCachedDay(days: Array<{ query: FixtureQuery | null }>): boolean {
  return days.some(({ query }) => query !== null)
}

function fixtureDayPreview(fixtures: CachedFixture[]): CachedFixture[] {
  return [...fixtures]
    .sort(
      (first, second) =>
        (first.startingAt ?? Number.MAX_SAFE_INTEGER) -
          (second.startingAt ?? Number.MAX_SAFE_INTEGER) || first.id - second.id
    )
    .slice(0, fixtureDayPreviewLimit)
}

function isoDateValue(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function formatHubDate(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDate(today, 1)) return 'Tomorrow'
  if (date === addDate(today, -1)) return 'Yesterday'

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(isoDateValue(date))
}

function emptyDateLabel(date: string, today: string): string {
  if (date === today) return 'No fixtures today.'

  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    timeZone: 'UTC'
  })
    .format(isoDateValue(date))
    .toLocaleLowerCase()

  return `No fixtures on ${weekday}.`
}

function weekDateAriaLabel(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(isoDateValue(date))
}

function addDate(date: string, days: number): string {
  const value = isoDateValue(date)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function UpcomingFixtures({
  days,
  today,
  online
}: {
  days: MatchdayFixturesDay[]
  today: string
  online: boolean
}): React.JSX.Element | null {
  const upcoming = days
    .filter(({ date }) => date > today)
    .flatMap(({ date, fixtures }) =>
      fixtures
        .filter((fixture) => fixture.stateId === 1 && !fixture.placeholder)
        .map((fixture) => ({ date, fixture }))
    )
    .sort(
      (a, b) =>
        (a.fixture.startingAt ?? Infinity) - (b.fixture.startingAt ?? Infinity) ||
        a.fixture.id - b.fixture.id
    )
    .slice(0, 10)
  if (!upcoming.length) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Up next</h2>
        <Link
          to="/fixtures"
          search={{ date: upcoming[0].date }}
          className="rounded-md text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all
        </Link>
      </div>
      <MatchdayCard>
        <div className="space-y-2 p-2">
          {upcoming.map(({ fixture, date }) => (
            <FixtureRow
              key={fixture.id}
              fixture={fixture}
              date={date}
              online={online}
              context={[formatHubDate(date, today), fixture.raw.league?.name]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </div>
      </MatchdayCard>
    </section>
  )
}
