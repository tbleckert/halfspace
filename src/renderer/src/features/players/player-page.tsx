import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, RefreshCw, UsersRound } from 'lucide-react'
import type { SportmonksPlayer } from '@shared/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedTeam, PlayerAppearanceRecord } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { PlayerPhoto } from './player-photo'
import { usePlayerAppearances, usePlayerEntity } from './use-player'

export function PlayerPage({
  competitionId,
  playerId,
  teamId
}: {
  competitionId?: number
  playerId: string
  teamId?: number
}): React.JSX.Element {
  const parsedPlayerId = Number(playerId)
  const validPlayerId = Number.isSafeInteger(parsedPlayerId) && parsedPlayerId > 0
  const online = useOnline()
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone])
  const [pageOpenedAt] = useState(() => Date.now())
  const player = usePlayerEntity(validPlayerId ? parsedPlayerId : null, online)
  const currentTeamId = teamId ?? player.cached?.teams[0]?.id ?? null
  const appearanceInput = useMemo(
    () =>
      validPlayerId && currentTeamId
        ? {
            playerId: parsedPlayerId,
            teamId: currentTeamId,
            startDate: addDaysToIsoDate(today, -90),
            endDate: today,
            timeZone
          }
        : null,
    [currentTeamId, parsedPlayerId, timeZone, today, validPlayerId]
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
            search={{ competition: competitionId }}
            className="mb-5 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
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
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.join(' ')}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <PlayerDetails player={identity} />
          <PlayerLineups
            competitionId={competitionId}
            lineups={appearances.cached?.appearances}
            loading={appearances.refreshing}
            now={pageOpenedAt}
            online={online}
            teamId={currentTeamId ?? undefined}
          />
        </div>

        <PlayerTeams competitionId={competitionId} online={online} teams={player.cached.teams} />
      </div>
    </div>
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
  online,
  teams
}: {
  competitionId?: number
  online: boolean
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
              search={{ competition: competitionId }}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45"
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
  lineups,
  loading,
  now,
  online,
  teamId
}: {
  competitionId?: number
  lineups: PlayerAppearanceRecord[] | undefined
  loading: boolean
  now: number
  online: boolean
  teamId?: number
}): React.JSX.Element {
  if (lineups === undefined) return <LineupsSkeleton />

  const recent = lineups
    .filter(({ fixture }) => fixture.startingAt !== null && fixture.startingAt < now)
    .toSorted((left, right) => (right.fixture.startingAt ?? 0) - (left.fixture.startingAt ?? 0))
    .slice(0, 6)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Recent lineups</h2>
      </div>
      {recent.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center px-4 text-sm text-muted-foreground">
          {loading ? 'Loading lineups…' : 'No lineups'}
        </div>
      ) : (
        <div className="divide-y">
          {recent.map(({ appearance, fixture }) => {
            const home = fixture.raw.participants.find(({ meta }) => meta?.location === 'home')
            const away = fixture.raw.participants.find(({ meta }) => meta?.location === 'away')
            const scores = fixture.raw.scores.filter(({ description }) => description === 'CURRENT')
            const homeScore = scores.find(({ score }) => score.participant === 'home')?.score.goals
            const awayScore = scores.find(({ score }) => score.participant === 'away')?.score.goals

            return (
              <Link
                key={appearance.key}
                to="/fixtures/$fixtureId"
                params={{ fixtureId: String(fixture.id) }}
                search={{ competition: competitionId, team: teamId }}
                className="block px-4 py-3.5 transition-colors hover:bg-muted/45"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex min-w-0 items-center gap-2">
                    <time className="shrink-0">{formatFixtureDate(fixture.startingAt)}</time>
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
                  <span className="font-semibold tabular-nums">{homeScore ?? '–'}</span>
                  <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
                    <TeamLogo
                      className="size-6 bg-background"
                      imagePath={away?.image_path ?? null}
                      online={online}
                    />
                    <span className="truncate">{away?.name ?? 'Away team'}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{awayScore ?? '–'}</span>
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
