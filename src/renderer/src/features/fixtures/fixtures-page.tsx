import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { CachedFixture, FixtureQuery } from '@/data/db'
import { prefetchFixtureEntity, useMatchdayWindow } from './use-fixtures'
import { buildMatchdaySections, matchdayWindow, type MatchdayFixturesDay } from './matchday-hub'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { fixtureRowStatus } from '@/lib/fixture-state'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { useCompetitions } from '@/features/competitions/use-competitions'
import { TeamLogo } from '@/features/teams/team-logo'
import { cn } from '@/lib/utils'
import { currentTimeZone, formatFixtureTime } from '@/lib/date'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useTodayInTimeZone } from '@/lib/use-today'
import { useOnline } from '@/lib/use-online'
import { MatchdayNews } from '@/features/news/matchday-news'

interface FixturesPageProps {
  date: string
}

const fixtureDayPreviewLimit = 8

export function FixturesPage({ date }: FixturesPageProps): React.JSX.Element {
  const navigate = useNavigate({ from: '/' })
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useTodayInTimeZone(timeZone)
  const online = useOnline()
  const { cached, refreshing, error, refresh } = useMatchdayWindow(date, timeZone, true)
  const { cached: competitionCatalog } = useCompetitions(false)
  const sections = useMemo(
    () => buildMatchdaySections(cached?.days ?? [], date, today),
    [cached?.days, date, today]
  )
  const navigationDates = useMemo(() => matchdayWindow(date).navigationDates, [date])
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
    <div className="grid min-h-full min-w-0 items-start min-[1120px]:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 px-6 pb-6 pt-3 lg:px-8 lg:pb-8">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-4">
          <h1 className="sr-only">Matchday</h1>

          <div className="min-w-72 flex-1">
            <WeekNavigator
              date={date}
              navigationDates={navigationDates}
              onSelect={(nextDate) =>
                void navigate({
                  search: (previous) => ({ ...previous, date: nextDate }),
                  replace: true
                })
              }
            />
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-lg border bg-card p-0.5 shadow-xs">
            <MatchdayDatePicker
              date={date}
              today={today}
              onSelect={(nextDate) =>
                void navigate({
                  search: (previous) => ({ ...previous, date: nextDate }),
                  replace: true
                })
              }
            />
            <Button
              aria-label="Refresh fixtures"
              disabled={refreshing}
              size="icon"
              variant="ghost"
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </header>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {cached === undefined ||
        (!cached.complete && refreshing && !hasAnyCachedDay(cached.days)) ? (
          <FixtureListSkeleton />
        ) : (
          <div className="flex flex-col gap-7">
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

            {sections.following.length > 0 && (
              <FixtureDayCollection
                competitionImagePaths={competitionImagePaths}
                days={sections.following}
                online={online}
                title={date === today ? 'Up next' : 'Following'}
                today={today}
              />
            )}

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
  )
}

function MatchdayDatePicker({
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

function FixtureRow({
  fixture,
  date,
  online
}: {
  fixture: CachedFixture
  date: string
  online: boolean
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  const { home: homeScore, away: awayScore } = currentFixtureScore(fixture.raw)
  const hasScore = homeScore !== undefined || awayScore !== undefined

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={{ date }}
      className="grid grid-cols-[4rem_minmax(0,1fr)_2rem] items-center gap-4 px-4 py-3 outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <FixtureRowStatus fixture={fixture} />
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={home?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm font-semibold text-foreground">
            {home?.name ?? fixture.name ?? 'Home team'}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={away?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm font-medium text-foreground/75">
            {away?.name ?? 'Away team'}
          </p>
        </div>
      </div>
      <div className="grid grid-rows-2 gap-0.5 text-right font-mono text-base font-extrabold tabular-nums text-brand-navy">
        {hasScore && (
          <>
            <span>{homeScore ?? '–'}</span>
            <span>{awayScore ?? '–'}</span>
          </>
        )}
      </div>
    </Link>
  )
}

function WeekNavigator({
  date,
  navigationDates,
  onSelect
}: {
  date: string
  navigationDates: string[]
  onSelect: (date: string) => void
}): React.JSX.Element {
  return (
    <nav aria-label="Matchday week" className="mx-auto flex w-full max-w-lg items-center gap-1">
      <Button
        aria-label="Previous week"
        className="size-7 text-muted-foreground"
        size="icon"
        variant="ghost"
        onClick={() => onSelect(addDate(date, -7))}
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
              aria-label={weekDateAriaLabel(navigationDate)}
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
                {formatCompactDate(navigationDate)}
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
        onClick={() => onSelect(addDate(date, 7))}
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </nav>
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
                  to="/"
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

function FixtureGroups({
  competitionImagePaths,
  date,
  fixtures,
  online
}: {
  competitionImagePaths: Map<number, string | null>
  date: string
  fixtures: CachedFixture[]
  online: boolean
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {groupFixtures(fixtures).map(({ leagueId, leagueName, fixtures: leagueFixtures }) => (
        <Card key={leagueId} className="overflow-hidden border-border/60 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(leagueId) }}
              search={{ date, season: leagueFixtures[0].seasonId }}
              className="flex w-fit items-center gap-2.5 rounded-md outline-none transition-colors hover:text-sidebar-primary focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              {...intentPrefetchProps(online, () => prefetchCompetitionWorkspace(leagueId))}
            >
              <CompetitionLogo
                className="size-6 bg-background"
                imagePath={competitionImagePaths.get(leagueId) ?? null}
                online={online}
              />
              <CardTitle>{leagueName}</CardTitle>
            </Link>
          </CardHeader>
          <div className="divide-y">
            {leagueFixtures.map((fixture) => (
              <FixtureRow key={fixture.id} date={date} fixture={fixture} online={online} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function FixtureRowStatus({ fixture }: { fixture: CachedFixture }): React.JSX.Element {
  const status = fixtureRowStatus(fixture.raw)

  if (status.kind === 'in-play') {
    return (
      <div className="flex items-center justify-center gap-2 font-mono text-sm font-semibold tabular-nums text-success-emphasis">
        <FixtureLiveIndicator showLabel={false} />
        <span>{status.label}</span>
      </div>
    )
  }

  if (status.kind === 'state') {
    return (
      <span className="text-center font-mono text-xs font-bold tracking-[0.08em] tabular-nums text-muted-foreground">
        {status.label}
      </span>
    )
  }

  return (
    <time className="text-center font-mono text-sm font-semibold tabular-nums text-brand-navy/70">
      {formatFixtureTime(fixture.startingAt)}
    </time>
  )
}

function FixtureListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-5">
      {[0, 1].map((section) => (
        <Card key={section} className="overflow-hidden border-border/60 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-4 w-36" />
            </div>
          </CardHeader>
          <div className="divide-y">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function groupFixtures(fixtures: CachedFixture[]): Array<{
  leagueId: number
  leagueName: string
  fixtures: CachedFixture[]
}> {
  const groups = new Map<
    number,
    { leagueId: number; leagueName: string; fixtures: CachedFixture[] }
  >()

  for (const fixture of fixtures) {
    const group = groups.get(fixture.leagueId) ?? {
      leagueId: fixture.leagueId,
      leagueName: fixture.raw.league?.name ?? `League ${fixture.leagueId}`,
      fixtures: []
    }
    group.fixtures.push(fixture)
    groups.set(fixture.leagueId, group)
  }

  return [...groups.values()]
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

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(
    isoDateValue(date)
  )
}

function formatCompactDate(date: string): string {
  return date.slice(-2)
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
