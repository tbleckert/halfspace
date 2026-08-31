import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UsersRound
} from 'lucide-react'
import type { SportmonksPlayer } from '@shared/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/error-alert'
import { EntitySubpageNavigation } from '@/components/entity-subpage-navigation'
import { entitySubpageNavigationItemClassName } from '@/components/entity-subpage-navigation-variants'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedTeam, PlayerAppearanceRecord } from '@/data/db'
import { prefetchFixtureEntity } from '@/features/fixtures/use-fixtures'
import { TeamLogo } from '@/features/teams/team-logo'
import { prefetchTeamEntity, prefetchTeamSquad } from '@/features/teams/use-team'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { useOnline } from '@/lib/use-online'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { PlayerPhoto } from './player-photo'
import {
  prefetchPlayerAppearances,
  prefetchPlayerEntity,
  usePlayerAppearances,
  usePlayerEntity
} from './use-player'

type PlayerView = 'matches' | 'overview'

const playerMatchWindowDays = 90

export function PlayerPage({
  competitionId,
  date,
  playerId,
  season,
  teamId,
  view = 'overview'
}: {
  competitionId?: number
  date?: string
  playerId: string
  season?: number
  teamId?: number
  view?: PlayerView
}): React.JSX.Element {
  const parsedPlayerId = Number(playerId)
  const validPlayerId = Number.isSafeInteger(parsedPlayerId) && parsedPlayerId > 0
  const online = useOnline()
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone])
  const matchWindowEnd = date ?? today
  const [pageOpenedAt] = useState(() => Date.now())
  const player = usePlayerEntity(validPlayerId ? parsedPlayerId : null, online)
  const currentTeamId = teamId ?? player.cached?.teams[0]?.id ?? null
  const appearanceInput = useMemo(
    () =>
      validPlayerId && currentTeamId
        ? {
            playerId: parsedPlayerId,
            teamId: currentTeamId,
            startDate: addDaysToIsoDate(matchWindowEnd, -playerMatchWindowDays),
            endDate: matchWindowEnd,
            timeZone
          }
        : null,
    [currentTeamId, matchWindowEnd, parsedPlayerId, timeZone, validPlayerId]
  )
  const appearances = usePlayerAppearances(appearanceInput, online)
  const identity = player.cached?.player?.raw
  const currentTeam = player.cached?.teams.find(({ id }) => id === currentTeamId)
  const refreshing = player.refreshing || appearances.refreshing
  const errors = [player.error, appearances.error].filter((error): error is string =>
    Boolean(error)
  )

  if (!validPlayerId) return <MissingPlayer />
  if (player.cached === undefined || (!identity && online && !player.error)) {
    return <PlayerPageSkeleton />
  }
  if (!identity) {
    return (
      <MissingPlayer
        message={online ? (player.error ?? 'Player not found.') : 'Player not available offline.'}
      />
    )
  }

  async function refresh(): Promise<void> {
    await Promise.all([player.refresh(), appearances.refresh()])
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div>
        {teamId && (
          <Link
            to="/teams/$teamId/squad"
            params={{ teamId: String(teamId) }}
            search={{ competition: competitionId, date, season }}
            className="mb-5 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            {...intentPrefetchProps(online, () => prefetchTeamSquad(teamId))}
          >
            <ArrowLeft className="size-4" />
            {currentTeam?.name ?? 'Team'}
          </Link>
        )}

        <header className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <PlayerPhoto
              className="size-20 rounded-xl bg-card shadow-xs"
              imagePath={identity.image_path ?? null}
              online={online}
            />
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight">
                {identity.display_name}
              </h1>
              <PlayerSummary player={identity} />
            </div>
          </div>

          <Button
            aria-label={`Refresh ${identity.display_name}`}
            disabled={!online || refreshing}
            size="icon"
            variant="outline"
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </header>

        <PlayerNavigation
          appearanceInput={appearanceInput}
          competitionId={competitionId}
          date={matchWindowEnd}
          online={online}
          playerId={parsedPlayerId}
          season={season}
          teamId={currentTeamId ?? undefined}
          view={view}
        />
      </div>

      {errors.length > 0 && <ErrorAlert>{errors.join(' ')}</ErrorAlert>}

      {view === 'overview' && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col gap-6">
            <PlayerDetails player={identity} />
            <PlayerLineups
              competitionId={competitionId}
              date={matchWindowEnd}
              lineups={appearances.cached?.appearances}
              loading={appearances.refreshing}
              now={pageOpenedAt}
              online={online}
              season={season}
              teamId={currentTeamId ?? undefined}
            />
          </div>

          <PlayerTeams
            competitionId={competitionId}
            date={matchWindowEnd}
            online={online}
            season={season}
            teams={player.cached.teams}
          />
        </div>
      )}

      {view === 'matches' && (
        <PlayerMatches
          competitionId={competitionId}
          date={matchWindowEnd}
          lineups={appearances.cached?.appearances}
          loading={appearances.refreshing}
          online={online}
          playerId={parsedPlayerId}
          season={season}
          teamId={currentTeamId ?? undefined}
          timeZone={timeZone}
        />
      )}
    </div>
  )
}

function PlayerMatches({
  competitionId,
  date,
  lineups,
  loading,
  online,
  playerId,
  season,
  teamId,
  timeZone
}: {
  competitionId?: number
  date: string
  lineups: PlayerAppearanceRecord[] | undefined
  loading: boolean
  online: boolean
  playerId: number
  season?: number
  teamId?: number
  timeZone: string
}): React.JSX.Element {
  const navigate = useNavigate({ from: '/players/$playerId/matches' })
  const currentWindowEnd = todayInTimeZone(timeZone)
  const windowStep = playerMatchWindowDays + 1

  function selectDate(nextDate: string): void {
    void navigate({
      params: { playerId: String(playerId) },
      search: (previous) => ({ ...previous, date: nextDate }),
      replace: true
    })
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-xl font-semibold tracking-tight">Matches</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            aria-label="Earlier matches"
            size="icon"
            variant="outline"
            onClick={() => selectDate(addDaysToIsoDate(date, -windowStep))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            aria-label="Match window end"
            className="w-40 bg-card font-mono tabular-nums"
            type="date"
            value={date}
            onChange={(event) => selectDate(event.target.value)}
          />
          <Button
            aria-label="Later matches"
            size="icon"
            variant="outline"
            onClick={() => selectDate(addDaysToIsoDate(date, windowStep))}
          >
            <ChevronRight className="size-4" />
          </Button>
          {date !== currentWindowEnd && (
            <Button variant="outline" onClick={() => selectDate(currentWindowEnd)}>
              Current
            </Button>
          )}
        </div>
      </div>

      <PlayerLineups
        competitionId={competitionId}
        date={date}
        limit={null}
        lineups={lineups}
        loading={loading}
        online={online}
        season={season}
        teamId={teamId}
        title="Team sheets"
      />
    </section>
  )
}

function PlayerNavigation({
  appearanceInput,
  competitionId,
  date,
  online,
  playerId,
  season,
  teamId,
  view
}: {
  appearanceInput: Parameters<typeof prefetchPlayerAppearances>[0] | null
  competitionId?: number
  date: string
  online: boolean
  playerId: number
  season?: number
  teamId?: number
  view: PlayerView
}): React.JSX.Element {
  const search = { competition: competitionId, date, season, team: teamId }

  return (
    <EntitySubpageNavigation aria-label="Player" className="mt-6 border-b">
      <Link
        aria-current={view === 'overview' ? 'page' : undefined}
        to="/players/$playerId"
        params={{ playerId: String(playerId) }}
        search={search}
        className={entitySubpageNavigationItemClassName(view === 'overview')}
        {...intentPrefetchProps(online, () => prefetchPlayerEntity(playerId))}
      >
        Overview
      </Link>
      <Link
        aria-current={view === 'matches' ? 'page' : undefined}
        to="/players/$playerId/matches"
        params={{ playerId: String(playerId) }}
        search={search}
        className={entitySubpageNavigationItemClassName(view === 'matches')}
        {...intentPrefetchProps(online && appearanceInput !== null, () =>
          appearanceInput ? prefetchPlayerAppearances(appearanceInput) : Promise.resolve()
        )}
      >
        Matches
      </Link>
    </EntitySubpageNavigation>
  )
}

function PlayerSummary({ player }: { player: SportmonksPlayer }): React.JSX.Element | null {
  const position = player.detailedPosition?.name ?? player.position?.name
  const age = player.date_of_birth ? ageAtDate(player.date_of_birth, new Date()) : null
  const summary = [position, player.nationality?.name, age === null ? null : `${age} years`].filter(
    Boolean
  )

  return summary.length > 0 ? (
    <p className="mt-1 truncate text-sm text-muted-foreground">{summary.join(' · ')}</p>
  ) : null
}

function PlayerDetails({ player }: { player: SportmonksPlayer }): React.JSX.Element {
  const details = [
    player.name !== player.display_name ? { label: 'Full name', value: player.name } : null,
    player.date_of_birth ? { label: 'Born', value: formatBirthDate(player.date_of_birth) } : null,
    player.nationality?.name ? { label: 'Nationality', value: player.nationality.name } : null,
    player.position?.name ? { label: 'Position', value: player.position.name } : null,
    player.detailedPosition?.name ? { label: 'Role', value: player.detailedPosition.name } : null,
    player.height ? { label: 'Height', value: `${player.height} cm` } : null,
    player.weight ? { label: 'Weight', value: `${player.weight} kg` } : null
  ].filter((detail): detail is { label: string; value: string } => detail !== null)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Details</h2>
      </div>
      {details.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center px-4 text-sm text-muted-foreground">
          No details
        </div>
      ) : (
        <dl className="divide-y">
          {details.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[7rem_1fr] gap-4 px-4 py-3.5 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

function PlayerTeams({
  competitionId,
  date,
  online,
  season,
  teams
}: {
  competitionId?: number
  date?: string
  online: boolean
  season?: number
  teams: CachedTeam[]
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Teams</h2>
      </div>
      {teams.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
          <UsersRound className="size-6" />
          <p className="text-sm font-medium text-foreground">No teams</p>
        </div>
      ) : (
        <div className="divide-y">
          {teams.map((team) => (
            <Link
              key={team.id}
              to="/teams/$teamId"
              params={{ teamId: String(team.id) }}
              search={{ competition: competitionId, date, season }}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45"
              {...intentPrefetchProps(online, () => prefetchTeamEntity(team.id))}
            >
              <TeamLogo
                className="size-9 bg-background"
                imagePath={team.imagePath}
                online={online}
              />
              <span className="truncate text-sm font-medium">{team.name}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function PlayerLineups({
  competitionId,
  date,
  limit = 6,
  lineups,
  loading,
  now,
  online,
  season,
  title = 'Recent lineups',
  teamId
}: {
  competitionId?: number
  date?: string
  limit?: number | null
  lineups: PlayerAppearanceRecord[] | undefined
  loading: boolean
  now?: number
  online: boolean
  season?: number
  title?: string
  teamId?: number
}): React.JSX.Element {
  if (lineups === undefined) return <LineupsSkeleton />

  const records = lineups
    .filter(
      ({ fixture }) =>
        fixture.startingAt !== null && (now === undefined || fixture.startingAt < now)
    )
    .toSorted((left, right) => (right.fixture.startingAt ?? 0) - (left.fixture.startingAt ?? 0))
  const visibleRecords = limit === null ? records : records.slice(0, limit)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {visibleRecords.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
          <CalendarDays className="size-6" />
          <p className="text-sm font-medium text-foreground">
            {loading ? 'Loading team sheets…' : 'No team sheets'}
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {visibleRecords.map(({ appearance, fixture }) => {
            const home = fixtureParticipantAt(fixture.raw, 'home')
            const away = fixtureParticipantAt(fixture.raw, 'away')
            const { home: homeScore, away: awayScore } = currentFixtureScore(fixture.raw)

            return (
              <Link
                key={appearance.key}
                to="/fixtures/$fixtureId"
                params={{ fixtureId: String(fixture.id) }}
                search={{ competition: competitionId, date, season, team: teamId }}
                className="block px-4 py-3.5 transition-colors hover:bg-muted/45"
                {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex min-w-0 items-center gap-2">
                    <time className="shrink-0 font-mono tabular-nums">
                      {formatFixtureDate(fixture.startingAt)}
                    </time>
                    <span>·</span>
                    <span className="truncate">
                      {fixture.raw.league?.name ?? `League ${fixture.leagueId}`}
                    </span>
                  </div>
                  <Badge className="shrink-0" variant="outline">
                    {appearance.lineup.type_id === 11 ? 'Started' : 'Bench'}
                  </Badge>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5 font-medium">
                    <TeamLogo
                      className="size-6 bg-background"
                      imagePath={home?.image_path ?? null}
                      online={online}
                    />
                    <span className="truncate">{home?.name ?? fixture.name ?? 'Home team'}</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{homeScore ?? '–'}</span>
                  <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
                    <TeamLogo
                      className="size-6 bg-background"
                      imagePath={away?.image_path ?? null}
                      online={online}
                    />
                    <span className="truncate">{away?.name ?? 'Away team'}</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{awayScore ?? '–'}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

function formatBirthDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

function ageAtDate(value: string, today: Date): number | null {
  const birthDate = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(birthDate.getTime())) return null

  let age = today.getFullYear() - birthDate.getUTCFullYear()
  const birthdayPassed =
    today.getMonth() > birthDate.getUTCMonth() ||
    (today.getMonth() === birthDate.getUTCMonth() && today.getDate() >= birthDate.getUTCDate())
  if (!birthdayPassed) age -= 1

  return age
}

function formatFixtureDate(timestamp: number | null): string {
  if (timestamp === null) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(timestamp)
}

function MissingPlayer({ message = 'Player not found.' }: { message?: string }): React.JSX.Element {
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

function PlayerPageSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <DetailsSkeleton />
          <LineupsSkeleton />
        </div>
        <DetailsSkeleton />
      </div>
    </div>
  )
}

function DetailsSkeleton(): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-4 p-4">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

function LineupsSkeleton(): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="space-y-5 p-4">
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
