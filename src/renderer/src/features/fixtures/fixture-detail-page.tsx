import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft } from 'lucide-react'
import type { SportmonksParticipant } from '@shared/contracts'
import { db } from '@/data/db'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { TeamLogo } from '@/features/teams/team-logo'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'

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
  const isValidFixtureId = Number.isSafeInteger(parsedFixtureId) && parsedFixtureId > 0
  const online = useOnline()
  const cached = useLiveQuery(async () => {
    if (!isValidFixtureId) return null

    const fixture = await db.fixtures.get(parsedFixtureId)
    if (!fixture) return { fixture: null, competition: null }

    return {
      fixture,
      competition: (await db.competitions.get(fixture.leagueId)) ?? null
    }
  }, [isValidFixtureId, parsedFixtureId])

  if (!isValidFixtureId) {
    return <MissingFixture competitionId={competitionId} date={date} teamId={teamId} />
  }

  if (cached === undefined) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>
  }

  if (!cached?.fixture) {
    return <MissingFixture competitionId={competitionId} date={date} teamId={teamId} />
  }

  const { competition, fixture } = cached
  const home = fixture.raw.participants.find((participant) => participant.meta?.location === 'home')
  const away = fixture.raw.participants.find((participant) => participant.meta?.location === 'away')
  const scores = fixture.raw.scores.filter(({ description }) => description === 'CURRENT')
  const homeScore = scores.find(({ score }) => score.participant === 'home')?.score.goals
  const awayScore = scores.find(({ score }) => score.participant === 'away')?.score.goals
  const hasScore = homeScore !== undefined || awayScore !== undefined
  const teamParticipant = fixture.raw.participants.find(({ id }) => id === teamId)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-7 lg:p-10">
      {teamId ? (
        <Link
          to="/teams/$teamId"
          params={{ teamId: String(teamId) }}
          search={{ competition: competitionId }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {teamParticipant?.name ?? 'Team'}
        </Link>
      ) : competitionId ? (
        <Link
          to="/competitions/$competitionId"
          params={{ competitionId: String(competitionId) }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {fixture.raw.league?.name ?? 'Competition'}
        </Link>
      ) : (
        <Link
          to="/"
          search={{ date }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Matchday
        </Link>
      )}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {home?.name ?? 'Home'} <span className="text-muted-foreground">vs</span>{' '}
          {away?.name ?? 'Away'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {[fixture.raw.league?.name ?? competition?.name, formatFixtureDate(fixture.startingAt)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid items-center gap-7 px-6 py-9 sm:grid-cols-[1fr_auto_1fr] sm:px-10">
            <FixtureTeam
              competitionId={competitionId ?? fixture.leagueId}
              online={online}
              participant={home}
            />

            <div className="flex flex-col items-center gap-2 text-center">
              {hasScore ? (
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {homeScore ?? '–'} <span className="text-muted-foreground">–</span>{' '}
                  {awayScore ?? '–'}
                </p>
              ) : (
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatFixtureTime(fixture.startingAt)}
                </p>
              )}
              <Badge variant="secondary">
                {fixture.resultInfo ?? fixture.raw.state?.name ?? 'Scheduled'}
              </Badge>
            </div>

            <FixtureTeam
              align="right"
              competitionId={competitionId ?? fixture.leagueId}
              online={online}
              participant={away}
            />
          </div>

          <div className="flex items-center justify-center border-t bg-muted/30 px-4 py-3">
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(competitionId ?? fixture.leagueId) }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {fixture.raw.league?.name ?? competition?.name ?? `League ${fixture.leagueId}`}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FixtureTeam({
  align = 'left',
  competitionId,
  online,
  participant
}: {
  align?: 'left' | 'right'
  competitionId: number
  online: boolean
  participant?: SportmonksParticipant
}): React.JSX.Element {
  if (!participant) {
    return <p className="text-center font-medium text-muted-foreground">Team unavailable</p>
  }

  return (
    <Link
      to="/teams/$teamId"
      params={{ teamId: String(participant.id) }}
      search={{ competition: competitionId }}
      className={cn(
        'flex min-w-0 items-center gap-4 rounded-lg outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring sm:flex-col sm:text-center',
        align === 'right' && 'flex-row-reverse text-right sm:flex-col sm:text-center'
      )}
    >
      <TeamLogo
        className="size-16 rounded-xl bg-background sm:size-20"
        imagePath={participant.image_path ?? null}
        online={online}
      />
      <span className="truncate text-lg font-semibold sm:max-w-48">{participant.name}</span>
    </Link>
  )
}

function MissingFixture({
  competitionId,
  date,
  teamId
}: {
  competitionId?: number
  date?: string
  teamId?: number
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-10">
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">Fixture not found.</p>
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
  if (timestamp === null) return 'Time unavailable'

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}
