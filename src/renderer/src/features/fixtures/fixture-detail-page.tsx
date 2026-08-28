import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import type { SportmonksFixture, SportmonksLineup, SportmonksParticipant } from '@shared/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedCompetition } from '@/data/db'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { TeamLogo } from '@/features/teams/team-logo'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { useFixtureEntity } from './use-fixtures'

interface FixtureDetailPageProps {
  competitionId?: number
  date?: string
  fixtureId: string
  teamId?: number
}

export function FixtureDetailPage({
  competitionId,
  date,
  fixtureId,
  teamId
}: FixtureDetailPageProps): React.JSX.Element {
  const parsedFixtureId = Number(fixtureId)
  const validFixtureId = Number.isSafeInteger(parsedFixtureId) && parsedFixtureId > 0
  const online = useOnline()
  const fixture = useFixtureEntity(validFixtureId ? parsedFixtureId : null, online)

  if (!validFixtureId) {
    return <MissingFixture competitionId={competitionId} date={date} teamId={teamId} />
  }

  if (fixture.cached === undefined || (!fixture.cached.fixture && online && !fixture.error)) {
    return <FixturePageSkeleton />
  }

  if (!fixture.cached.fixture) {
    return (
      <MissingFixture
        competitionId={competitionId}
        date={date}
        message={
          online ? (fixture.error ?? 'Fixture not found.') : 'Fixture not available offline.'
        }
        teamId={teamId}
      />
    )
  }

  const cachedFixture = fixture.cached.fixture
  const match = cachedFixture.raw
  const home = participantAt(match, 'home')
  const away = participantAt(match, 'away')
  const heading = `${home?.name ?? 'Home'} vs ${away?.name ?? 'Away'}`
  const teamParticipant = match.participants.find(({ id }) => id === teamId)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div>
        <FixtureBackLink
          competitionId={competitionId}
          competitionName={match.league?.name ?? fixture.cached.competition?.name}
          date={date}
          teamId={teamId}
          teamName={teamParticipant?.name}
        />

        <header className="flex items-center justify-between gap-5">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {[
                match.league?.name ?? fixture.cached.competition?.name,
                formatFixtureDate(cachedFixture.startingAt)
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <Button
            aria-label={`Refresh ${heading}`}
            disabled={!online || fixture.refreshing}
            size="icon"
            variant="outline"
            onClick={() => void fixture.refresh()}
          >
            <RefreshCw className={cn('size-4', fixture.refreshing && 'animate-spin')} />
          </Button>
        </header>
      </div>

      {fixture.error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{fixture.error}</span>
        </div>
      )}

      <MatchScore
        competitionId={competitionId ?? cachedFixture.leagueId}
        fixture={match}
        online={online}
        startingAt={cachedFixture.startingAt}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <FixtureLineups
          away={away}
          competitionId={competitionId ?? cachedFixture.leagueId}
          home={home}
          lineups={match.lineups ?? []}
          online={online}
        />
        <FixtureDetails
          competition={fixture.cached.competition}
          competitionId={competitionId ?? cachedFixture.leagueId}
          fixture={match}
          online={online}
          startingAt={cachedFixture.startingAt}
        />
      </div>
    </div>
  )
}

function MatchScore({
  competitionId,
  fixture,
  online,
  startingAt
}: {
  competitionId: number
  fixture: SportmonksFixture
  online: boolean
  startingAt: number | null
}): React.JSX.Element {
  const home = participantAt(fixture, 'home')
  const away = participantAt(fixture, 'away')
  const scores = fixture.scores.filter(({ description }) => description === 'CURRENT')
  const homeScore = scores.find(({ score }) => score.participant === 'home')?.score.goals
  const awayScore = scores.find(({ score }) => score.participant === 'away')?.score.goals
  const hasScore = homeScore !== undefined || awayScore !== undefined

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-8 sm:gap-8 sm:px-10 sm:py-10">
        <FixtureTeam competitionId={competitionId} online={online} participant={home} />

        <div className="flex min-w-20 flex-col items-center gap-2 text-center sm:min-w-32">
          {hasScore ? (
            <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {homeScore ?? '–'} <span className="text-muted-foreground">–</span> {awayScore ?? '–'}
            </p>
          ) : (
            <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {formatFixtureTime(startingAt)}
            </p>
          )}
          <Badge variant="secondary">{fixture.state?.name ?? 'Scheduled'}</Badge>
        </div>

        <FixtureTeam competitionId={competitionId} online={online} participant={away} />
      </div>
    </section>
  )
}

function FixtureTeam({
  competitionId,
  online,
  participant
}: {
  competitionId: number
  online: boolean
  participant?: SportmonksParticipant
}): React.JSX.Element {
  if (!participant) {
    return <p className="text-center text-sm font-medium text-muted-foreground">Team unavailable</p>
  }

  return (
    <Link
      to="/teams/$teamId"
      params={{ teamId: String(participant.id) }}
      search={{ competition: competitionId }}
      className="group flex min-w-0 flex-col items-center gap-3 rounded-lg text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TeamLogo
        className="size-16 rounded-xl bg-background shadow-xs sm:size-24"
        imagePath={participant.image_path ?? null}
        online={online}
      />
      <span className="max-w-full truncate text-sm font-semibold group-hover:text-primary sm:text-lg">
        {participant.name}
      </span>
    </Link>
  )
}

function FixtureLineups({
  away,
  competitionId,
  home,
  lineups,
  online
}: {
  away?: SportmonksParticipant
  competitionId: number
  home?: SportmonksParticipant
  lineups: SportmonksLineup[]
  online: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Lineups</h2>
      </div>
      {lineups.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center px-4 text-sm text-muted-foreground">
          Lineups not available
        </div>
      ) : (
        <div className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <TeamLineup
            competitionId={competitionId}
            entries={lineups.filter(({ team_id }) => team_id === home?.id)}
            online={online}
            team={home}
          />
          <TeamLineup
            competitionId={competitionId}
            entries={lineups.filter(({ team_id }) => team_id === away?.id)}
            online={online}
            team={away}
          />
        </div>
      )}
    </section>
  )
}

function TeamLineup({
  competitionId,
  entries,
  online,
  team
}: {
  competitionId: number
  entries: SportmonksLineup[]
  online: boolean
  team?: SportmonksParticipant
}): React.JSX.Element {
  const starters = lineupGroup(entries, 11)
  const substitutes = lineupGroup(entries, 12)

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3 border-b bg-muted/25 px-4 py-3">
        <TeamLogo
          className="size-8 bg-background"
          imagePath={team?.image_path ?? null}
          online={online}
        />
        <h3 className="truncate text-sm font-semibold">{team?.name ?? 'Team'}</h3>
      </div>
      {entries.length === 0 ? (
        <div className="flex min-h-24 items-center justify-center px-4 text-sm text-muted-foreground">
          Not available
        </div>
      ) : (
        <div className="divide-y">
          <LineupGroup
            competitionId={competitionId}
            entries={starters}
            label="Starting XI"
            teamId={team?.id}
          />
          <LineupGroup
            competitionId={competitionId}
            entries={substitutes}
            label="Substitutes"
            teamId={team?.id}
          />
        </div>
      )}
    </div>
  )
}

function LineupGroup({
  competitionId,
  entries,
  label,
  teamId
}: {
  competitionId: number
  entries: SportmonksLineup[]
  label: string
  teamId?: number
}): React.JSX.Element | null {
  if (entries.length === 0) return null

  return (
    <div>
      <h4 className="px-4 pb-1 pt-3 text-xs font-medium text-muted-foreground">{label}</h4>
      <div className="pb-2">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            to="/players/$playerId"
            params={{ playerId: String(entry.player_id) }}
            search={{ competition: competitionId, team: teamId }}
            className="grid grid-cols-[2rem_1fr] items-center gap-2 px-4 py-2 text-sm outline-none hover:bg-muted/45 focus-visible:bg-muted/45"
          >
            <span className="text-center font-medium tabular-nums text-muted-foreground">
              {entry.jersey_number ?? '–'}
            </span>
            <span className="truncate font-medium">{entry.player_name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function FixtureDetails({
  competition,
  competitionId,
  fixture,
  online,
  startingAt
}: {
  competition: CachedCompetition | null
  competitionId: number
  fixture: SportmonksFixture
  online: boolean
  startingAt: number | null
}): React.JSX.Element {
  const competitionName = fixture.league?.name ?? competition?.name ?? `League ${competitionId}`

  return (
    <section className="order-first overflow-hidden rounded-xl border bg-card shadow-xs lg:order-last">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Details</h2>
      </div>
      <dl className="divide-y text-sm">
        <div className="px-4 py-3.5">
          <dt className="mb-2 text-xs text-muted-foreground">Competition</dt>
          <dd>
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(competitionId) }}
              className="flex items-center gap-2 font-medium hover:text-primary"
            >
              <CompetitionLogo
                className="size-7 bg-background"
                imagePath={competition?.imagePath ?? null}
                online={online}
              />
              <span className="truncate">{competitionName}</span>
            </Link>
          </dd>
        </div>
        {startingAt !== null && (
          <Detail label="Kickoff" value={formatFixtureDate(startingAt) ?? ''} />
        )}
        {fixture.stage?.name && <Detail label="Stage" value={fixture.stage.name} />}
        {fixture.round?.name && <Detail label="Round" value={fixture.round.name} />}
        {fixture.venue && fixture.venue_id && (
          <div className="px-4 py-3.5">
            <dt className="mb-1 text-xs text-muted-foreground">Venue</dt>
            <dd>
              <Link
                to="/venues/$venueId"
                params={{ venueId: String(fixture.venue_id) }}
                search={{ competition: competitionId, team: undefined }}
                className="font-medium hover:text-primary"
              >
                {fixture.venue.name}
              </Link>
              {fixture.venue.city_name && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {fixture.venue.city_name}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="px-4 py-3.5">
      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function FixtureBackLink({
  competitionId,
  competitionName,
  date,
  teamId,
  teamName
}: {
  competitionId?: number
  competitionName?: string
  date?: string
  teamId?: number
  teamName?: string
}): React.JSX.Element {
  const className =
    'mb-5 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground'

  if (teamId) {
    return (
      <Link
        to="/teams/$teamId"
        params={{ teamId: String(teamId) }}
        search={{ competition: competitionId }}
        className={className}
      >
        <ArrowLeft className="size-4" />
        {teamName ?? 'Team'}
      </Link>
    )
  }

  if (competitionId) {
    return (
      <Link
        to="/competitions/$competitionId"
        params={{ competitionId: String(competitionId) }}
        className={className}
      >
        <ArrowLeft className="size-4" />
        {competitionName ?? 'Competition'}
      </Link>
    )
  }

  return (
    <Link to="/" search={{ date }} className={className}>
      <ArrowLeft className="size-4" />
      Matchday
    </Link>
  )
}

function MissingFixture({
  competitionId,
  date,
  message = 'Fixture not found.',
  teamId
}: {
  competitionId?: number
  date?: string
  message?: string
  teamId?: number
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">{message}</p>
          {teamId ? (
            <Link
              to="/teams/$teamId"
              params={{ teamId: String(teamId) }}
              search={{ competition: competitionId }}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
            >
              <ArrowLeft className="size-4" />
              Back to team
            </Link>
          ) : competitionId ? (
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(competitionId) }}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
            >
              <ArrowLeft className="size-4" />
              Back to competition
            </Link>
          ) : (
            <Link
              to="/"
              search={{ date }}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
            >
              <ArrowLeft className="size-4" />
              Back to Matchday
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FixturePageSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="order-first h-64 rounded-xl lg:order-last" />
      </div>
    </div>
  )
}

function participantAt(
  fixture: SportmonksFixture,
  location: 'home' | 'away'
): SportmonksParticipant | undefined {
  return fixture.participants.find((participant) => participant.meta?.location === location)
}

function lineupGroup(entries: SportmonksLineup[], typeId: number): SportmonksLineup[] {
  return entries
    .filter(({ type_id }) => type_id === typeId)
    .toSorted(
      (left, right) =>
        (left.formation_position ?? Number.MAX_SAFE_INTEGER) -
          (right.formation_position ?? Number.MAX_SAFE_INTEGER) ||
        (left.jersey_number ?? Number.MAX_SAFE_INTEGER) -
          (right.jersey_number ?? Number.MAX_SAFE_INTEGER)
    )
}

function formatFixtureDate(timestamp: number | null): string | null {
  if (timestamp === null) return null

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

function formatFixtureTime(timestamp: number | null): string {
  if (timestamp === null) return 'TBD'

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}
