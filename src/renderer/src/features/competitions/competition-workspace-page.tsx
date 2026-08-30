import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trophy,
  UsersRound
} from 'lucide-react'
import type { CachedStanding } from '@/data/db'
import { db } from '@/data/db'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'
import {
  groupEntityFixturesByDate,
  splitEntityFixtures
} from '@/features/fixtures/entity-fixture-data'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { LeagueStatisticsView } from '@/features/statistics/statistics-views'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { useOnline } from '@/lib/use-online'
import { CompetitionLogo } from './competition-logo'
import {
  competitionSeasonOptions,
  competitionTeams,
  groupStandings,
  nearestFixtureSeasonId,
  seasonFixtureDate,
  selectedCompetitionSeason
} from './competition-workspace-data'
import {
  competitionWorkspaceFixtureInput,
  prefetchCompetitionWorkspace,
  prefetchSeasonStatistics,
  useCompetitionFixtures,
  useCompetitionSeasons,
  useSeasonStatistics,
  useStandings
} from './use-competition-workspace'

type CompetitionView = 'overview' | 'fixtures' | 'stats' | 'teams'

export function CompetitionWorkspacePage({
  competitionId,
  date,
  season: requestedSeasonId,
  view = 'overview'
}: {
  competitionId: string
  date?: string
  season?: number
  view?: CompetitionView
}): React.JSX.Element {
  const parsedCompetitionId = Number(competitionId)
  const validCompetitionId = Number.isSafeInteger(parsedCompetitionId) && parsedCompetitionId > 0
  const competition = useLiveQuery(
    async () =>
      validCompetitionId ? ((await db.competitions.get(parsedCompetitionId)) ?? null) : null,
    [parsedCompetitionId, validCompetitionId]
  )
  const online = useOnline()
  const navigate = useNavigate({ from: '/competitions/$competitionId' })
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = todayInTimeZone(timeZone)
  const seasons = useCompetitionSeasons(validCompetitionId ? parsedCompetitionId : null, online)
  const seasonOptions = useMemo(
    () =>
      competitionSeasonOptions(
        seasons.cached?.seasons ?? [],
        competition?.raw.currentseason ?? null
      ),
    [competition?.raw.currentseason, seasons.cached?.seasons]
  )
  const selectedSeason = useMemo(
    () => selectedCompetitionSeason(seasonOptions, requestedSeasonId),
    [requestedSeasonId, seasonOptions]
  )
  const fixtureDate = date ?? seasonFixtureDate(selectedSeason, today)
  const fixtureInput = useMemo(
    () =>
      validCompetitionId
        ? competitionWorkspaceFixtureInput(parsedCompetitionId, fixtureDate, timeZone)
        : null,
    [fixtureDate, parsedCompetitionId, timeZone, validCompetitionId]
  )
  const [workspaceOpenedAt] = useState(() => Date.now())
  const fixtures = useCompetitionFixtures(fixtureInput, online && view !== 'stats')
  const observedSeasonId = useMemo(
    () => nearestFixtureSeasonId(fixtures.cached?.fixtures ?? [], workspaceOpenedAt),
    [fixtures.cached?.fixtures, workspaceOpenedAt]
  )
  const seasonId =
    (requestedSeasonId && !seasons.cached ? requestedSeasonId : selectedSeason?.id) ??
    competition?.currentSeasonId ??
    observedSeasonId
  const standings = useStandings(seasonId, online && view !== 'fixtures' && view !== 'stats')
  const statistics = useSeasonStatistics(seasonId, online && view === 'stats')
  const seasonFixtures = useMemo(() => {
    const cachedFixtures = fixtures.cached?.fixtures ?? []
    return seasonId === null
      ? cachedFixtures
      : cachedFixtures.filter((fixture) => fixture.seasonId === seasonId)
  }, [fixtures.cached?.fixtures, seasonId])
  const standingGroups = useMemo(
    () => groupStandings(standings.cached?.standings ?? []),
    [standings.cached?.standings]
  )
  const fixtureSections = useMemo(
    () => splitEntityFixtures(seasonFixtures, workspaceOpenedAt),
    [seasonFixtures, workspaceOpenedAt]
  )
  const fixtureGroups = useMemo(
    () => groupEntityFixturesByDate(seasonFixtures, timeZone),
    [seasonFixtures, timeZone]
  )
  const teams = useMemo(
    () => competitionTeams(standings.cached?.standings ?? [], seasonFixtures),
    [seasonFixtures, standings.cached?.standings]
  )
  const refreshing =
    seasons.refreshing ||
    (view === 'stats' ? statistics.refreshing : fixtures.refreshing) ||
    (view !== 'fixtures' && view !== 'stats' && standings.refreshing)
  const errors = [
    seasons.error,
    view === 'stats' ? statistics.error : fixtures.error,
    view === 'overview' || view === 'teams' ? standings.error : null
  ].filter((error): error is string => Boolean(error))

  if (competition === undefined) return <CompetitionWorkspaceSkeleton />
  if (!competition) return <MissingCompetition />

  async function refresh(): Promise<void> {
    await Promise.all([
      seasons.refresh(),
      view === 'stats' ? statistics.refresh() : fixtures.refresh(),
      view === 'overview' || view === 'teams' ? standings.refresh() : Promise.resolve()
    ])
  }

  function selectSeason(nextSeasonId: number): void {
    const nextSeason = seasonOptions.find(({ id }) => id === nextSeasonId)
    if (!nextSeason) return

    void navigate({
      search: (previous) => ({
        ...previous,
        date: seasonFixtureDate(nextSeason, today),
        season: nextSeason.id
      }),
      replace: true
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div>
        <header className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <CompetitionLogo
              className="size-16 rounded-xl bg-card shadow-xs"
              imagePath={competition.imagePath}
              online={online}
            />
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight">{competition.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                {competition.raw.country?.name && <span>{competition.raw.country.name}</span>}
                {competition.raw.country?.name && seasonOptions.length > 0 && <span>·</span>}
                {seasonOptions.length > 0 && (
                  <label className="relative -ml-1 inline-flex items-center">
                    <span className="sr-only">Season</span>
                    <select
                      aria-label="Season"
                      className="h-7 appearance-none rounded-md bg-transparent py-0 pl-1 pr-6 font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-70"
                      disabled={seasonOptions.length < 2}
                      value={selectedSeason?.id ?? seasonId ?? ''}
                      onChange={(event) => selectSeason(Number(event.target.value))}
                    >
                      {seasonOptions.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1 size-3.5" />
                  </label>
                )}
              </div>
            </div>
          </div>

          <Button
            aria-label={`Refresh ${competition.name}`}
            disabled={!online || refreshing}
            size="icon"
            variant="outline"
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </header>

        <CompetitionNavigation
          competitionId={competition.id}
          date={fixtureDate}
          online={online}
          season={seasonId ?? undefined}
          view={view}
        />
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.join(' ')}</span>
        </div>
      )}

      {view === 'overview' && (
        <CompetitionOverview
          competitionId={competition.id}
          date={fixtureDate}
          fixtureSections={fixtureSections}
          fixturesLoading={fixtures.refreshing}
          fixturesLoaded={fixtures.cached !== undefined}
          online={online}
          season={seasonId ?? undefined}
          seasonId={seasonId}
          standingGroups={standingGroups}
          standingsLoaded={standings.cached !== undefined}
          standingsLoading={standings.refreshing}
        />
      )}

      {view === 'fixtures' && (
        <CompetitionFixtures
          competitionId={competition.id}
          date={fixtureDate}
          fixtureGroups={fixtureGroups}
          fixturesLoaded={fixtures.cached !== undefined}
          loading={fixtures.refreshing}
          online={online}
          season={selectedSeason}
          timeZone={timeZone}
        />
      )}

      {view === 'teams' && (
        <CompetitionTeams
          competitionId={competition.id}
          loaded={fixtures.cached !== undefined && standings.cached !== undefined}
          loading={refreshing}
          online={online}
          season={seasonId ?? undefined}
          teams={teams}
        />
      )}

      {view === 'stats' && (
        <LeagueStatisticsView
          loaded={statistics.cached !== undefined}
          loading={statistics.refreshing}
          statistics={statistics.cached?.statistics ?? []}
        />
      )}
    </div>
  )
}

function CompetitionNavigation({
  competitionId,
  date,
  online,
  season,
  view
}: {
  competitionId: number
  date: string
  online: boolean
  season?: number
  view: CompetitionView
}): React.JSX.Element {
  const itemClassName =
    'relative px-0.5 pb-3 text-sm font-medium outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring'
  const workspacePrefetch = intentPrefetchProps(online, () =>
    prefetchCompetitionWorkspace(competitionId)
  )
  const statisticsPrefetch = intentPrefetchProps(online && season !== undefined, () =>
    season === undefined ? Promise.resolve() : prefetchSeasonStatistics(season)
  )

  return (
    <nav aria-label="Competition" className="mt-6 flex gap-6 border-b">
      <Link
        aria-current={view === 'overview' ? 'page' : undefined}
        to="/competitions/$competitionId"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={competitionNavigationClassName(itemClassName, view === 'overview')}
        {...workspacePrefetch}
      >
        Overview
      </Link>
      <Link
        aria-current={view === 'fixtures' ? 'page' : undefined}
        to="/competitions/$competitionId/fixtures"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={competitionNavigationClassName(itemClassName, view === 'fixtures')}
        {...workspacePrefetch}
      >
        Fixtures
      </Link>
      <Link
        aria-current={view === 'teams' ? 'page' : undefined}
        to="/competitions/$competitionId/teams"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={competitionNavigationClassName(itemClassName, view === 'teams')}
        {...workspacePrefetch}
      >
        Teams
      </Link>
      <Link
        aria-current={view === 'stats' ? 'page' : undefined}
        to="/competitions/$competitionId/stats"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={competitionNavigationClassName(itemClassName, view === 'stats')}
        {...statisticsPrefetch}
      >
        Stats
      </Link>
    </nav>
  )
}

function competitionNavigationClassName(itemClassName: string, active: boolean): string {
  return cn(
    itemClassName,
    active
      ? 'font-semibold text-foreground after:absolute after:inset-x-0 after:-bottom-px after:z-10 after:h-0.5 after:bg-current after:content-[""]'
      : 'text-muted-foreground hover:text-foreground'
  )
}

function CompetitionOverview({
  competitionId,
  date,
  fixtureSections,
  fixturesLoaded,
  fixturesLoading,
  online,
  season,
  seasonId,
  standingGroups,
  standingsLoaded,
  standingsLoading
}: {
  competitionId: number
  date: string
  fixtureSections: ReturnType<typeof splitEntityFixtures>
  fixturesLoaded: boolean
  fixturesLoading: boolean
  online: boolean
  season?: number
  seasonId: number | null
  standingGroups: ReturnType<typeof groupStandings>
  standingsLoaded: boolean
  standingsLoading: boolean
}): React.JSX.Element {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <div className="flex flex-col gap-4">
        {!standingsLoaded ? (
          <StandingsSkeleton />
        ) : seasonId === null ? (
          <EmptyPanel icon={<Trophy className="size-6" />} label="No current season" />
        ) : standingGroups.length === 0 ? (
          <EmptyPanel
            icon={<Trophy className="size-6" />}
            label={standingsLoading ? 'Loading table…' : 'No table'}
          />
        ) : (
          standingGroups.map((group) => (
            <StandingsTable
              key={group.key}
              competitionId={competitionId}
              name={standingGroups.length === 1 ? 'Table' : group.name}
              online={online}
              season={season}
              standings={group.standings}
            />
          ))
        )}
      </div>

      <div className="flex flex-col gap-5">
        {!fixturesLoaded ? (
          <FixturesSkeleton />
        ) : (
          <>
            <EntityFixturePanel
              context={{ competition: competitionId, date, season }}
              fixtures={fixtureSections.upcoming}
              label="Upcoming"
              loading={fixturesLoading}
              online={online}
            />
            <EntityFixturePanel
              context={{ competition: competitionId, date, season }}
              fixtures={fixtureSections.recent}
              label="Recent"
              loading={fixturesLoading}
              online={online}
            />
          </>
        )}
      </div>
    </div>
  )
}

function CompetitionFixtures({
  competitionId,
  date,
  fixtureGroups,
  fixturesLoaded,
  loading,
  online,
  season,
  timeZone
}: {
  competitionId: number
  date: string
  fixtureGroups: ReturnType<typeof groupEntityFixturesByDate>
  fixturesLoaded: boolean
  loading: boolean
  online: boolean
  season: ReturnType<typeof selectedCompetitionSeason>
  timeZone: string
}): React.JSX.Element {
  const navigate = useNavigate({ from: '/competitions/$competitionId/fixtures' })
  const today = todayInTimeZone(timeZone)

  function selectDate(nextDate: string): void {
    void navigate({
      params: { competitionId: String(competitionId) },
      search: (previous) => ({
        ...previous,
        date: seasonFixtureDate(season, nextDate)
      }),
      replace: true
    })
  }

  const defaultDate = seasonFixtureDate(season, today)

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-xl font-semibold tracking-tight">Fixtures</h2>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Earlier fixtures"
            disabled={Boolean(season?.starting_at && date <= season.starting_at)}
            size="icon"
            variant="outline"
            onClick={() => selectDate(addDaysToIsoDate(date, -29))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            aria-label="Fixture window date"
            className="w-40 bg-card"
            type="date"
            value={date}
            min={season?.starting_at ?? undefined}
            max={season?.ending_at ?? undefined}
            onChange={(event) => selectDate(event.target.value)}
          />
          <Button
            aria-label="Later fixtures"
            disabled={Boolean(season?.ending_at && date >= season.ending_at)}
            size="icon"
            variant="outline"
            onClick={() => selectDate(addDaysToIsoDate(date, 29))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {!fixturesLoaded ? (
        <FixturesBrowserSkeleton />
      ) : fixtureGroups.length === 0 ? (
        <EmptyPanel
          icon={<CalendarDays className="size-6" />}
          label={loading ? 'Loading fixtures…' : 'No fixtures'}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {fixtureGroups.map((group) => (
            <EntityFixturePanel
              key={group.date}
              context={{
                competition: competitionId,
                date,
                season: season?.id
              }}
              dateDisplay="time"
              fixtures={group.fixtures}
              label={formatFixtureGroupDate(group.date)}
              loading={loading}
              online={online}
            />
          ))}
        </div>
      )}

      {date !== defaultDate && (
        <button
          className="self-start text-sm font-medium text-primary hover:underline"
          onClick={() => selectDate(defaultDate)}
        >
          {defaultDate === today ? 'Return to today' : 'Latest fixtures'}
        </button>
      )}
    </section>
  )
}

function CompetitionTeams({
  competitionId,
  loaded,
  loading,
  online,
  season,
  teams
}: {
  competitionId: number
  loaded: boolean
  loading: boolean
  online: boolean
  season?: number
  teams: ReturnType<typeof competitionTeams>
}): React.JSX.Element {
  if (!loaded) return <TeamsSkeleton />

  if (teams.length === 0) {
    return (
      <EmptyPanel
        icon={<UsersRound className="size-6" />}
        label={loading ? 'Loading teams…' : 'No teams'}
      />
    )
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold tracking-tight">Teams</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              to="/teams/$teamId"
              params={{ teamId: String(team.id) }}
              search={{ competition: competitionId, season }}
              className="flex h-full items-center gap-4 rounded-xl border bg-card p-4 shadow-xs outline-none transition-colors hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring"
              {...intentPrefetchProps(online, () => prefetchTeamEntity(team.id))}
            >
              <TeamLogo
                className="size-14 rounded-xl bg-background"
                imagePath={team.imagePath}
                online={online}
              />
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{team.name}</h3>
                {team.position !== null && (
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    #{team.position} · {team.points} pts
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StandingsTable({
  competitionId,
  name,
  online,
  season,
  standings
}: {
  competitionId: number
  name: string
  online: boolean
  season?: number
  standings: CachedStanding[]
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{name}</h2>
      </div>
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-muted/45 text-xs text-muted-foreground">
          <tr>
            <th className="w-12 px-4 py-2 text-left font-medium">#</th>
            <th className="px-2 py-2 text-left font-medium">Team</th>
            <th className="w-14 px-4 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {standings.map((standing) => (
            <tr key={standing.id}>
              <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                {standing.position}
              </td>
              <td className="px-2 py-2.5">
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(standing.participantId) }}
                  search={{ competition: competitionId, season }}
                  className="flex min-w-0 items-center gap-2.5 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  {...intentPrefetchProps(online, () => prefetchTeamEntity(standing.participantId))}
                >
                  <TeamLogo
                    className="size-7 bg-background"
                    imagePath={standing.raw.participant?.image_path ?? null}
                    online={online}
                  />
                  <span className="truncate font-medium">
                    {standing.raw.participant?.name ?? `Team ${standing.participantId}`}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                {standing.raw.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function EmptyPanel({ icon, label }: { icon: React.ReactNode; label: string }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        {icon}
        <p className="font-medium text-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function formatFixtureGroupDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long'
  }).format(new Date(`${date}T12:00:00Z`))
}

function MissingCompetition(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">Competition not found.</p>
          <Link to="/competitions" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            Competitions
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function CompetitionWorkspaceSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <StandingsSkeleton />
        <FixturesSkeleton />
      </div>
    </div>
  )
}

function StandingsSkeleton(): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-4 p-4">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Skeleton className="h-4 w-5" />
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-6" />
          </div>
        ))}
      </div>
    </div>
  )
}

function FixturesSkeleton(): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-5 p-4">
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  )
}

function FixturesBrowserSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1, 2].map((group) => (
        <div key={group} className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-4">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-5 p-4">
            {[0, 1].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="size-7 rounded-md" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TeamsSkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((team) => (
        <div key={team} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <Skeleton className="size-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
