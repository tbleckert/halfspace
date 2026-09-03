import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trophy,
  UsersRound
} from 'lucide-react'
import { db } from '@/data/db'
import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
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
import { CompetitionLeaderCards } from './competition-leader-cards'
import { PlayerLeaders } from './player-leaders'
import { SeasonSchedule } from './season-schedule'
import { TeamOfWeek } from './team-of-week'
import { StandingsTable } from './standings-table'
import { prefetchSeasonSchedule, useSeasonSchedule } from './use-season-schedule'
import type { PlayerLeaderboardCategory } from './player-leaders-data'
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
  prefetchSeasonTopscorers,
  useCompetitionFixtures,
  useCompetitionSeasons,
  useSeasonStatistics,
  useSeasonTopscorers,
  useStandings
} from './use-competition-workspace'

type CompetitionView = 'overview' | 'fixtures' | 'stats' | 'teams' | 'schedule' | 'team-of-week'

export function CompetitionWorkspacePage({
  competitionId,
  date,
  season: requestedSeasonId,
  leaderboard = 'goals',
  stage,
  round,
  view = 'overview'
}: {
  competitionId: string
  date?: string
  season?: number
  leaderboard?: PlayerLeaderboardCategory
  stage?: number
  round?: number
  view?: CompetitionView
}): React.JSX.Element {
  const parsedCompetitionId = Number(competitionId)
  const validCompetitionId = Number.isSafeInteger(parsedCompetitionId) && parsedCompetitionId > 0
  const competition = useScopedLiveQuery(
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
  const fixtures = useCompetitionFixtures(
    fixtureInput,
    online && view !== 'stats' && view !== 'schedule' && view !== 'team-of-week'
  )
  const observedSeasonId = useMemo(
    () => nearestFixtureSeasonId(fixtures.cached?.fixtures ?? [], workspaceOpenedAt),
    [fixtures.cached?.fixtures, workspaceOpenedAt]
  )
  const seasonId =
    (requestedSeasonId && !seasons.cached ? requestedSeasonId : selectedSeason?.id) ??
    competition?.currentSeasonId ??
    observedSeasonId
  const standings = useStandings(seasonId, online && (view === 'overview' || view === 'teams'))
  const schedule = useSeasonSchedule(seasonId, online && view === 'schedule')
  const statistics = useSeasonStatistics(seasonId, online && view === 'stats')
  const showPlayerLeaders = view === 'overview' || view === 'stats'
  const topscorers = useSeasonTopscorers(seasonId, online && showPlayerLeaders)
  const leadersLoaded =
    topscorers.cached !== undefined &&
    (!topscorers.cached || topscorers.cached.seasonId === seasonId)
  const seasonTopscorers =
    topscorers.cached?.seasonId === seasonId ? topscorers.cached.topscorers : null
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
    (view === 'schedule'
      ? schedule.refreshing
      : view === 'stats'
        ? statistics.refreshing
        : view !== 'team-of-week' && fixtures.refreshing) ||
    (showPlayerLeaders && topscorers.refreshing) ||
    ((view === 'overview' || view === 'teams') && standings.refreshing)
  const errors = [
    seasons.error,
    view === 'schedule'
      ? schedule.error
      : view === 'stats'
        ? statistics.error
        : view === 'team-of-week'
          ? null
          : fixtures.error,
    showPlayerLeaders ? topscorers.error : null,
    view === 'overview' || view === 'teams' ? standings.error : null
  ].filter((error): error is string => Boolean(error))

  if (competition === undefined) return <CompetitionWorkspaceSkeleton />
  if (!competition) return <MissingCompetition />

  async function refresh(): Promise<void> {
    await Promise.all([
      seasons.refresh(),
      view === 'schedule'
        ? schedule.refresh()
        : view === 'stats'
          ? statistics.refresh()
          : view === 'team-of-week'
            ? Promise.resolve()
            : fixtures.refresh(),
      showPlayerLeaders ? topscorers.refresh() : Promise.resolve(),
      view === 'overview' || view === 'teams' ? standings.refresh() : Promise.resolve()
    ])
  }

  function selectSeason(nextSeasonId: number): void {
    const nextSeason = seasonOptions.find(({ id }) => id === nextSeasonId)
    if (!nextSeason) return

    void navigate({
      to:
        view === 'overview'
          ? '/competitions/$competitionId'
          : `/competitions/$competitionId/${view}`,
      search: (previous) => ({
        ...previous,
        date: seasonFixtureDate(nextSeason, today),
        season: nextSeason.id,
        stage: undefined,
        round: undefined
      }),
      replace: true
    })
  }

  function selectLeaderboard(category: PlayerLeaderboardCategory): void {
    void navigate({
      to: '/competitions/$competitionId/stats',
      search: (previous) => ({ ...previous, leaderboard: category }),
      resetScroll: false
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
                  <NativeSelect
                    aria-label="Season"
                    className="-ml-1 has-[select:disabled]:opacity-100 [&_[data-slot=native-select-icon]]:right-1 [&_[data-slot=native-select-icon]]:size-3.5"
                    disabled={seasonOptions.length < 2}
                    selectClassName="h-7 rounded-md border-0 py-0 pl-1 pr-6 font-medium text-foreground shadow-none hover:bg-muted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-70"
                    value={selectedSeason?.id ?? seasonId ?? ''}
                    onChange={(event) => selectSeason(Number(event.target.value))}
                  >
                    {seasonOptions.map((season) => (
                      <NativeSelectOption key={season.id} value={season.id}>
                        {season.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </div>
            </div>
          </div>

          {view !== 'team-of-week' && (
            <Button
              aria-label={`Refresh ${competition.name}`}
              disabled={!online || refreshing}
              size="icon"
              variant="outline"
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            </Button>
          )}
        </header>

        <CompetitionNavigation
          competitionId={competition.id}
          date={fixtureDate}
          online={online}
          season={seasonId ?? undefined}
          view={view}
        />
      </div>

      {errors.length > 0 && <ErrorAlert>{errors.join(' ')}</ErrorAlert>}

      {view === 'team-of-week' && (
        <TeamOfWeek
          competitionId={competition.id}
          seasonId={seasonId}
          currentSeason={selectedSeason?.is_current ?? seasonId === competition.currentSeasonId}
          roundId={round}
          date={fixtureDate}
          online={online}
          onRoundChange={(round) =>
            void navigate({
              to: '/competitions/$competitionId/team-of-week',
              search: (previous) => ({ ...previous, round, stage: undefined }),
              resetScroll: false
            })
          }
        />
      )}
      {view === 'schedule' && (
        <SeasonSchedule
          cached={schedule.cached}
          loading={schedule.refreshing}
          online={online}
          competitionId={competition.id}
          seasonId={seasonId}
          stageId={stage}
          roundId={round}
          onSelect={(stage, round) =>
            void navigate({
              to: '/competitions/$competitionId/schedule',
              search: (previous) => ({ ...previous, stage, round }),
              resetScroll: false
            })
          }
        />
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
          playerHighlights={
            <CompetitionLeaderCards
              competitionId={competition.id}
              date={fixtureDate}
              seasonId={seasonId}
              online={online}
              loading={!leadersLoaded || (topscorers.refreshing && seasonTopscorers === null)}
              topscorers={seasonTopscorers}
            />
          }
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
        <>
          <LeagueStatisticsView
            loaded={statistics.cached !== undefined}
            loading={statistics.refreshing}
            statistics={statistics.cached?.statistics ?? []}
          />
          <PlayerLeaders
            competitionId={competition.id}
            date={fixtureDate}
            seasonId={seasonId}
            online={online}
            loaded={leadersLoaded}
            loading={topscorers.refreshing}
            topscorers={seasonTopscorers}
            category={leaderboard}
            onCategoryChange={selectLeaderboard}
          />
        </>
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
  const workspacePrefetch = intentPrefetchProps(online, () =>
    prefetchCompetitionWorkspace(competitionId)
  )
  const overviewPrefetch = intentPrefetchProps(online, async () => {
    await Promise.all([
      prefetchCompetitionWorkspace(competitionId),
      season === undefined ? Promise.resolve() : prefetchSeasonTopscorers(season)
    ])
  })
  const statisticsPrefetch = intentPrefetchProps(online && season !== undefined, () =>
    season === undefined
      ? Promise.resolve()
      : Promise.all([prefetchSeasonStatistics(season), prefetchSeasonTopscorers(season)]).then(
          () => undefined
        )
  )

  return (
    <EntitySubpageNavigation aria-label="Competition" className="mt-6 border-b">
      <Link
        aria-current={view === 'overview' ? 'page' : undefined}
        to="/competitions/$competitionId"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={entitySubpageNavigationItemClassName(view === 'overview')}
        {...overviewPrefetch}
      >
        Overview
      </Link>
      <Link
        aria-current={view === 'fixtures' ? 'page' : undefined}
        to="/competitions/$competitionId/fixtures"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={entitySubpageNavigationItemClassName(view === 'fixtures')}
        {...workspacePrefetch}
      >
        Fixtures
      </Link>
      <Link
        to="/competitions/$competitionId/schedule"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        aria-current={view === 'schedule' ? 'page' : undefined}
        className={entitySubpageNavigationItemClassName(view === 'schedule')}
        {...intentPrefetchProps(online && season !== undefined, () =>
          season === undefined ? Promise.resolve() : prefetchSeasonSchedule(season)
        )}
      >
        Schedule
      </Link>
      <Link
        aria-current={view === 'teams' ? 'page' : undefined}
        to="/competitions/$competitionId/teams"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={entitySubpageNavigationItemClassName(view === 'teams')}
        {...workspacePrefetch}
      >
        Teams
      </Link>
      <Link
        aria-current={view === 'stats' ? 'page' : undefined}
        to="/competitions/$competitionId/stats"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={entitySubpageNavigationItemClassName(view === 'stats')}
        {...statisticsPrefetch}
      >
        Stats
      </Link>
      <Link
        aria-current={view === 'team-of-week' ? 'page' : undefined}
        to="/competitions/$competitionId/team-of-week"
        params={{ competitionId: String(competitionId) }}
        search={{ date, season }}
        className={entitySubpageNavigationItemClassName(view === 'team-of-week')}
      >
        Team of the Week
      </Link>
    </EntitySubpageNavigation>
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
  standingsLoading,
  playerHighlights
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
  playerHighlights: React.ReactNode
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
              date={date}
              online={online}
              season={season}
              standings={group.standings}
            />
          ))
        )}
      </div>

      <div className="flex flex-col gap-5">
        {playerHighlights}
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
            className="w-40 bg-card font-mono tabular-nums"
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
        <Button
          className="h-auto self-start px-0 text-sm active:scale-100"
          size="sm"
          variant="link"
          onClick={() => selectDate(defaultDate)}
        >
          {defaultDate === today ? 'Return to today' : 'Latest fixtures'}
        </Button>
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
                  <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
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
