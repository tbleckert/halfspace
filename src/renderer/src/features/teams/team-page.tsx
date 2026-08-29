import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trophy,
  UsersRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedCompetition, CachedStanding, SquadMember } from '@/data/db'
import { db, readTeamStandings } from '@/data/db'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import {
  groupEntityFixturesByDate,
  splitEntityFixtures
} from '@/features/fixtures/entity-fixture-data'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { VenueCard } from '@/features/venues/venue-card'
import { prefetchVenueEntity } from '@/features/venues/use-venue'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { TeamLogo } from './team-logo'
import {
  prefetchTeamEntity,
  prefetchTeamFixtures,
  prefetchTeamSquad,
  teamFixtureInput,
  useTeamEntity,
  useTeamFixtures,
  useTeamSquad
} from './use-team'

interface TeamCompetitionContext {
  competition: CachedCompetition
  standing: CachedStanding | null
}

type TeamView = 'fixtures' | 'overview' | 'squad'

export function TeamPage({
  competitionId,
  date,
  teamId,
  view = 'overview'
}: {
  competitionId?: number
  date?: string
  teamId: string
  view?: TeamView
}): React.JSX.Element {
  const parsedTeamId = Number(teamId)
  const validTeamId = Number.isSafeInteger(parsedTeamId) && parsedTeamId > 0
  const online = useOnline()
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone])
  const fixtureDate = date ?? today
  const fixtureInput = useMemo(
    () => (validTeamId ? teamFixtureInput(parsedTeamId, fixtureDate, timeZone) : null),
    [fixtureDate, parsedTeamId, timeZone, validTeamId]
  )
  const [pageOpenedAt] = useState(() => Date.now())
  const team = useTeamEntity(validTeamId ? parsedTeamId : null, online)
  const fixtures = useTeamFixtures(fixtureInput, online && view !== 'squad')
  const squad = useTeamSquad(validTeamId ? parsedTeamId : null, online && view === 'squad')
  const competitionContexts = useLiveQuery(
    () =>
      validTeamId ? readTeamCompetitionContexts(parsedTeamId, competitionId) : Promise.resolve([]),
    [competitionId, parsedTeamId, validTeamId]
  )
  const fixtureSections = useMemo(
    () => splitEntityFixtures(fixtures.cached?.fixtures ?? [], pageOpenedAt),
    [fixtures.cached?.fixtures, pageOpenedAt]
  )
  const fixtureGroups = useMemo(
    () => groupEntityFixturesByDate(fixtures.cached?.fixtures ?? [], timeZone),
    [fixtures.cached?.fixtures, timeZone]
  )
  const refreshing = team.refreshing || (view === 'squad' ? squad.refreshing : fixtures.refreshing)
  const errors = [team.error, view === 'squad' ? squad.error : fixtures.error].filter(
    (error): error is string => Boolean(error)
  )
  const identity = team.cached?.team?.raw ?? team.cached?.participant

  if (!validTeamId) return <MissingTeam />
  if (
    team.cached === undefined ||
    competitionContexts === undefined ||
    (!identity && online && !team.error)
  ) {
    return <TeamPageSkeleton />
  }
  if (!identity) {
    return (
      <MissingTeam
        message={online ? (team.error ?? 'Team not found.') : 'Team not available offline.'}
      />
    )
  }

  const detailedTeam = team.cached.team?.raw

  async function refresh(): Promise<void> {
    await Promise.all([team.refresh(), view === 'squad' ? squad.refresh() : fixtures.refresh()])
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div>
        {competitionId && (
          <Link
            to="/competitions/$competitionId"
            params={{ competitionId: String(competitionId) }}
            className="mb-5 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {competitionContexts.find(({ competition }) => competition.id === competitionId)
              ?.competition.name ?? 'Competition'}
          </Link>
        )}

        <header className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <TeamLogo
              className="size-16 rounded-xl bg-card shadow-xs"
              imagePath={identity.image_path ?? null}
              online={online}
            />
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight">{identity.name}</h1>
              {detailedTeam && (
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  {detailedTeam.country?.name && <span>{detailedTeam.country.name}</span>}
                  {detailedTeam.founded && (
                    <>
                      <span>·</span>
                      <span>Founded {detailedTeam.founded}</span>
                    </>
                  )}
                  {detailedTeam.venue && detailedTeam.venue_id && (
                    <>
                      <span>·</span>
                      <Link
                        to="/venues/$venueId"
                        params={{ venueId: String(detailedTeam.venue_id) }}
                        search={{ competition: competitionId, team: parsedTeamId }}
                        className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        {...intentPrefetchProps(online, () =>
                          prefetchVenueEntity(detailedTeam.venue_id!)
                        )}
                      >
                        {detailedTeam.venue.name}
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            aria-label={`Refresh ${identity.name}`}
            disabled={!online || refreshing}
            size="icon"
            variant="outline"
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </header>

        <TeamNavigation
          competitionId={competitionId}
          date={fixtureDate}
          fixtureInput={fixtureInput!}
          online={online}
          teamId={parsedTeamId}
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
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,0.65fr)_minmax(24rem,1.35fr)]">
          <div className="flex flex-col gap-5">
            <TeamCompetitions contexts={competitionContexts} online={online} />
            {detailedTeam?.venue && detailedTeam.venue_id && (
              <VenueCard
                competitionId={competitionId}
                countryName={detailedTeam.country?.name}
                online={online}
                teamId={parsedTeamId}
                venueId={detailedTeam.venue_id}
                venueSummary={detailedTeam.venue}
              />
            )}
          </div>

          <div className="flex flex-col gap-5">
            {fixtures.cached === undefined ? (
              <FixturesSkeleton />
            ) : (
              <>
                <EntityFixturePanel
                  context={{ competition: competitionId, date: fixtureDate, team: parsedTeamId }}
                  fixtures={fixtureSections.upcoming}
                  label="Upcoming"
                  loading={fixtures.refreshing}
                  online={online}
                  showCompetition
                />
                <EntityFixturePanel
                  context={{ competition: competitionId, date: fixtureDate, team: parsedTeamId }}
                  fixtures={fixtureSections.recent}
                  label="Recent"
                  loading={fixtures.refreshing}
                  online={online}
                  showCompetition
                />
              </>
            )}
          </div>
        </div>
      )}

      {view === 'fixtures' && (
        <TeamFixtures
          competitionId={competitionId}
          date={fixtureDate}
          fixtureGroups={fixtureGroups}
          fixturesLoaded={fixtures.cached !== undefined}
          loading={fixtures.refreshing}
          online={online}
          teamId={parsedTeamId}
          timeZone={timeZone}
        />
      )}

      {view === 'squad' && (
        <TeamSquad
          competitionId={competitionId}
          loading={squad.refreshing}
          members={squad.cached?.members}
          online={online}
          teamId={parsedTeamId}
        />
      )}
    </div>
  )
}

function TeamNavigation({
  competitionId,
  date,
  fixtureInput,
  online,
  teamId,
  view
}: {
  competitionId?: number
  date: string
  fixtureInput: ReturnType<typeof teamFixtureInput>
  online: boolean
  teamId: number
  view: TeamView
}): React.JSX.Element {
  const itemClassName =
    'relative px-0.5 pb-3 text-sm font-medium outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <nav aria-label="Team" className="mt-6 flex gap-6 border-b">
      <Link
        aria-current={view === 'overview' ? 'page' : undefined}
        to="/teams/$teamId"
        params={{ teamId: String(teamId) }}
        search={{ competition: competitionId, date }}
        className={teamNavigationClassName(itemClassName, view === 'overview')}
        {...intentPrefetchProps(online, () => prefetchTeamEntity(teamId))}
      >
        Overview
      </Link>
      <Link
        aria-current={view === 'fixtures' ? 'page' : undefined}
        to="/teams/$teamId/fixtures"
        params={{ teamId: String(teamId) }}
        search={{ competition: competitionId, date }}
        className={teamNavigationClassName(itemClassName, view === 'fixtures')}
        {...intentPrefetchProps(online, () => prefetchTeamFixtures(fixtureInput))}
      >
        Fixtures
      </Link>
      <Link
        aria-current={view === 'squad' ? 'page' : undefined}
        to="/teams/$teamId/squad"
        params={{ teamId: String(teamId) }}
        search={{ competition: competitionId, date }}
        className={teamNavigationClassName(itemClassName, view === 'squad')}
        {...intentPrefetchProps(online, () => prefetchTeamSquad(teamId))}
      >
        Squad
      </Link>
    </nav>
  )
}

function teamNavigationClassName(itemClassName: string, active: boolean): string {
  return cn(
    itemClassName,
    active
      ? 'font-semibold text-foreground after:absolute after:inset-x-0 after:-bottom-px after:z-10 after:h-0.5 after:bg-current after:content-[""]'
      : 'text-muted-foreground hover:text-foreground'
  )
}

function TeamFixtures({
  competitionId,
  date,
  fixtureGroups,
  fixturesLoaded,
  loading,
  online,
  teamId,
  timeZone
}: {
  competitionId?: number
  date: string
  fixtureGroups: ReturnType<typeof groupEntityFixturesByDate>
  fixturesLoaded: boolean
  loading: boolean
  online: boolean
  teamId: number
  timeZone: string
}): React.JSX.Element {
  const navigate = useNavigate({ from: '/teams/$teamId/fixtures' })
  const today = todayInTimeZone(timeZone)

  function selectDate(nextDate: string): void {
    void navigate({
      params: { teamId: String(teamId) },
      search: (previous) => ({ ...previous, date: nextDate }),
      replace: true
    })
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-xl font-semibold tracking-tight">Fixtures</h2>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Earlier fixtures"
            size="icon"
            variant="outline"
            onClick={() => selectDate(addDaysToIsoDate(date, -61))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            aria-label="Fixture window date"
            className="w-40 bg-card"
            type="date"
            value={date}
            onChange={(event) => selectDate(event.target.value)}
          />
          <Button
            aria-label="Later fixtures"
            size="icon"
            variant="outline"
            onClick={() => selectDate(addDaysToIsoDate(date, 61))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {!fixturesLoaded ? (
        <TeamFixturesBrowserSkeleton />
      ) : fixtureGroups.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <CalendarDays className="size-6" />
            <p className="font-medium text-foreground">
              {loading ? 'Loading fixtures…' : 'No fixtures'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {fixtureGroups.map((group) => (
            <EntityFixturePanel
              key={group.date}
              context={{ competition: competitionId, date, team: teamId }}
              dateDisplay="time"
              fixtures={group.fixtures}
              label={formatFixtureGroupDate(group.date)}
              loading={loading}
              online={online}
              showCompetition
            />
          ))}
        </div>
      )}

      {date !== today && (
        <button
          className="self-start text-sm font-medium text-primary hover:underline"
          onClick={() => selectDate(today)}
        >
          Return to today
        </button>
      )}
    </section>
  )
}

function TeamSquad({
  competitionId,
  loading,
  members,
  online,
  teamId
}: {
  competitionId?: number
  loading: boolean
  members: SquadMember[] | undefined
  online: boolean
  teamId: number
}): React.JSX.Element {
  if (members === undefined) return <SquadSkeleton />

  const groups = groupSquad(members)

  if (groups.length === 0) {
    return (
      <section className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border bg-card px-4 text-center text-muted-foreground shadow-xs">
        <UsersRound className="size-6" />
        <p className="text-sm font-medium text-foreground">
          {loading ? 'Loading squad…' : online ? 'No squad' : 'Squad not available offline'}
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ label, members: groupMembers }) => (
        <section key={label}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-sm font-semibold">{label}</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {groupMembers.map((member) => (
              <SquadPlayerCard
                key={member.entry.id}
                competitionId={competitionId}
                member={member}
                online={online}
                teamId={teamId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function SquadPlayerCard({
  competitionId,
  member: { entry, player },
  online,
  teamId
}: {
  competitionId?: number
  member: SquadMember
  online: boolean
  teamId: number
}): React.JSX.Element {
  const position =
    entry.detailedPositionName ?? entry.positionName ?? player.raw.position?.name ?? null
  const nationality = player.raw.nationality?.name
  const metadata = [position, nationality].filter(Boolean).join(' · ')

  return (
    <Link
      to="/players/$playerId"
      params={{ playerId: String(player.id) }}
      search={{ competition: competitionId, team: teamId }}
      className="group flex min-w-0 flex-col items-center rounded-xl border bg-card px-4 py-5 text-center shadow-xs outline-none transition-[border-color,transform] duration-150 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
      {...intentPrefetchProps(online, () => prefetchPlayerEntity(player.id))}
    >
      <div className="relative">
        <PlayerPhoto
          className="size-20 rounded-full border bg-muted"
          imagePath={player.imagePath}
          online={online}
        />
        <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border bg-card text-xs font-semibold tabular-nums shadow-xs">
          {entry.jerseyNumber ?? '–'}
        </span>
      </div>
      <div className="mt-4 w-full min-w-0">
        <p className="truncate text-sm font-semibold" title={player.displayName}>
          {player.displayName}
        </p>
        {metadata && <p className="mt-1 truncate text-xs text-muted-foreground">{metadata}</p>}
      </div>
    </Link>
  )
}

function groupSquad(members: SquadMember[]): Array<{ label: string; members: SquadMember[] }> {
  const positions = [
    { id: 24, label: 'Goalkeepers' },
    { id: 25, label: 'Defenders' },
    { id: 26, label: 'Midfielders' },
    { id: 27, label: 'Attackers' }
  ]
  const groups = positions.flatMap(({ id, label }) => {
    const groupMembers = members
      .filter(({ entry }) => entry.positionId === id)
      .toSorted(compareSquadMembers)
    return groupMembers.length > 0 ? [{ label, members: groupMembers }] : []
  })
  const otherMembers = members
    .filter(({ entry }) => !positions.some(({ id }) => id === entry.positionId))
    .toSorted(compareSquadMembers)

  return otherMembers.length > 0 ? [...groups, { label: 'Other', members: otherMembers }] : groups
}

function compareSquadMembers(left: SquadMember, right: SquadMember): number {
  if (left.entry.jerseyNumber !== null && right.entry.jerseyNumber !== null) {
    return left.entry.jerseyNumber - right.entry.jerseyNumber
  }
  if (left.entry.jerseyNumber !== null) return -1
  if (right.entry.jerseyNumber !== null) return 1
  return left.player.displayName.localeCompare(right.player.displayName)
}

function TeamCompetitions({
  contexts,
  online
}: {
  contexts: TeamCompetitionContext[]
  online: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Competitions</h2>
      </div>
      {contexts.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
          <Trophy className="size-6" />
          <p className="text-sm font-medium text-foreground">No competitions</p>
        </div>
      ) : (
        <div className="divide-y">
          {contexts.map(({ competition, standing }) => (
            <Link
              key={competition.id}
              to="/competitions/$competitionId"
              params={{ competitionId: String(competition.id) }}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45"
              {...intentPrefetchProps(online, () => prefetchCompetitionWorkspace(competition.id))}
            >
              <CompetitionLogo
                className="size-9 bg-background"
                imagePath={competition.imagePath}
                online={online}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{competition.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {competition.currentSeasonName ?? competition.raw.country?.name ?? 'Competition'}
                </p>
              </div>
              {standing && (
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">#{standing.position}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {standing.raw.points} pts
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

async function readTeamCompetitionContexts(
  teamId: number,
  competitionId?: number
): Promise<TeamCompetitionContext[]> {
  const standings = await readTeamStandings(teamId)
  const competitionIds = [
    ...new Set([
      ...standings.map(({ leagueId }) => leagueId),
      ...(competitionId ? [competitionId] : [])
    ])
  ]
  const competitions = (await db.competitions.bulkGet(competitionIds)).filter(
    (competition): competition is CachedCompetition => competition !== undefined
  )

  return competitions
    .map((competition) => ({
      competition,
      standing:
        standings.find(
          ({ leagueId, seasonId }) =>
            leagueId === competition.id &&
            (competition.currentSeasonId === null || seasonId === competition.currentSeasonId)
        ) ?? null
    }))
    .toSorted((left, right) => {
      if (left.competition.id === competitionId) return -1
      if (right.competition.id === competitionId) return 1
      return left.competition.name.localeCompare(right.competition.name)
    })
}

function MissingTeam({ message = 'Team not found.' }: { message?: string }): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">{message}</p>
          <Link to="/competitions" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            Competitions
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function TeamPageSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.65fr)_minmax(24rem,1.35fr)]">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-4">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-4 p-4">
            {[0, 1].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <FixturesSkeleton />
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

function TeamFixturesBrowserSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1, 2].map((group) => (
        <div key={group} className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="divide-y">
            {[0, 1].map((row) => (
              <div key={row} className="space-y-3 px-4 py-3.5">
                <Skeleton className="h-3 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
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

function SquadSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      {[0, 1].map((group) => (
        <section key={group}>
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2].map((card) => (
              <div
                key={card}
                className="flex flex-col items-center rounded-xl border bg-card px-4 py-5"
              >
                <Skeleton className="size-20 rounded-full" />
                <Skeleton className="mt-4 h-4 w-24" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
