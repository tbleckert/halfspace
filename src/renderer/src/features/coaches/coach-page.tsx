import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import type { SportmonksCoach } from '@shared/contracts'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CoachTeamRecord } from '@/data/db'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'
import { splitEntityFixtures } from '@/features/fixtures/entity-fixture-data'
import { TeamLogo } from '@/features/teams/team-logo'
import { teamFixtureInput, useTeamFixtures } from '@/features/teams/use-team'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { prefetchTeamEntity } from '@/features/teams/use-team'
import { CoachPhoto } from './coach-photo'
import { useCoachEntity } from './use-coach'

export function CoachPage({
  coachId,
  competitionId,
  date,
  season,
  teamId
}: {
  coachId: string
  competitionId?: number
  date?: string
  season?: number
  teamId?: number
}): React.JSX.Element {
  const parsedCoachId = Number(coachId)
  const validCoachId = Number.isSafeInteger(parsedCoachId) && parsedCoachId > 0
  const online = useOnline()
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone])
  const coach = useCoachEntity(validCoachId ? parsedCoachId : null, online)
  const teams = useMemo(() => sortCoachTeams(coach.cached?.teams ?? []), [coach.cached?.teams])
  const currentTeam = teams.find(({ assignment }) => assignment.active) ?? null
  const currentTeamId = currentTeam?.team.id ?? null
  const fixtureInput = useMemo(
    () =>
      currentTeamId
        ? teamFixtureInput(currentTeamId, addDaysToIsoDate(today, -60), timeZone)
        : null,
    [currentTeamId, timeZone, today]
  )
  const fixtures = useTeamFixtures(fixtureInput, online && fixtureInput !== null)
  const [pageOpenedAt] = useState(() => Date.now())
  const recentFixtures = useMemo(
    () => splitEntityFixtures(fixtures.cached?.fixtures ?? [], pageOpenedAt).recent,
    [fixtures.cached?.fixtures, pageOpenedAt]
  )
  const identity = coach.cached?.coach?.raw
  const errors = [coach.error, fixtures.error].filter((error): error is string => Boolean(error))

  if (!validCoachId) return <MissingCoach />
  if (coach.cached === undefined || (!identity && online && !coach.error)) {
    return <CoachPageSkeleton />
  }
  if (!identity) {
    return (
      <MissingCoach
        message={online ? (coach.error ?? 'Coach not found.') : 'Coach not available offline.'}
      />
    )
  }

  const originTeam = teams.find(({ team }) => team.id === teamId)?.team

  async function refresh(): Promise<void> {
    await Promise.all([coach.refresh(), fixtureInput ? fixtures.refresh() : Promise.resolve()])
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div>
        {teamId && (
          <Link
            to="/teams/$teamId"
            params={{ teamId: String(teamId) }}
            search={{ competition: competitionId, date, season }}
            className="mb-5 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            {...intentPrefetchProps(online, () => prefetchTeamEntity(teamId))}
          >
            <ArrowLeft className="size-4" />
            {originTeam?.name ?? 'Team'}
          </Link>
        )}

        <header className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <CoachPhoto
              className="size-20 rounded-xl bg-card shadow-xs"
              imagePath={identity.image_path ?? null}
              online={online}
            />
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight">
                {identity.display_name}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {[identity.nationality?.name, currentTeam?.team.name].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <Button
            aria-label={`Refresh ${identity.display_name}`}
            disabled={!online || coach.refreshing || fixtures.refreshing}
            size="icon"
            variant="outline"
            onClick={() => void refresh()}
          >
            <RefreshCw
              className={cn('size-4', (coach.refreshing || fixtures.refreshing) && 'animate-spin')}
            />
          </Button>
        </header>
      </div>

      {errors.length > 0 && <ErrorAlert>{errors.join(' ')}</ErrorAlert>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {currentTeam && (
            <EntityFixturePanel
              context={{
                competition: competitionId,
                date: date ?? today,
                season,
                team: currentTeam.team.id
              }}
              emptyLabel="No recent matches"
              fixtures={recentFixtures}
              label="Recent matches"
              loading={fixtures.cached === undefined || fixtures.refreshing}
              online={online}
              showCompetition
            />
          )}
          <CoachCareer
            competitionId={competitionId}
            date={date ?? today}
            online={online}
            season={season}
            teams={teams}
          />
        </div>

        <aside className="flex flex-col gap-5">
          {currentTeam && (
            <CoachCurrentTeam
              competitionId={competitionId}
              date={date ?? today}
              online={online}
              record={currentTeam}
              season={season}
            />
          )}
          <CoachDetails coach={identity} />
        </aside>
      </div>
    </div>
  )
}

function CoachCurrentTeam({
  competitionId,
  date,
  online,
  record,
  season
}: {
  competitionId?: number
  date: string
  online: boolean
  record: CoachTeamRecord
  season?: number
}): React.JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="text-sm">Current club</CardTitle>
      </CardHeader>
      <Link
        to="/teams/$teamId"
        params={{ teamId: String(record.team.id) }}
        search={{ competition: competitionId, date, season }}
        className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/45"
        {...intentPrefetchProps(online, () => prefetchTeamEntity(record.team.id))}
      >
        <TeamLogo
          className="size-10 bg-background"
          imagePath={record.team.imagePath}
          online={online}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{record.team.name}</p>
          {record.assignment.start && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Since {formatCareerDate(record.assignment.start)}
            </p>
          )}
        </div>
      </Link>
    </Card>
  )
}

function CoachCareer({
  competitionId,
  date,
  online,
  season,
  teams
}: {
  competitionId?: number
  date: string
  online: boolean
  season?: number
  teams: CoachTeamRecord[]
}): React.JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="text-sm">Career</CardTitle>
      </CardHeader>
      {teams.length === 0 ? (
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Career history not available
        </CardContent>
      ) : (
        <div className="divide-y">
          {teams.map(({ assignment, team }) => (
            <Link
              key={assignment.id}
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
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{team.name}</p>
              <p className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {formatCareerPeriod(assignment.start, assignment.end, assignment.active)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

function CoachDetails({ coach }: { coach: SportmonksCoach }): React.JSX.Element {
  const details = [
    coach.date_of_birth ? ['Born', formatBirthDate(coach.date_of_birth)] : null,
    coach.nationality?.name ? ['Nationality', coach.nationality.name] : null,
    coach.height ? ['Height', `${coach.height} cm`] : null
  ].filter((detail): detail is [string, string] => detail !== null)

  if (details.length === 0) return <></>

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="text-sm">Details</CardTitle>
      </CardHeader>
      <div className="divide-y">
        {details.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function sortCoachTeams(teams: CoachTeamRecord[]): CoachTeamRecord[] {
  return teams.toSorted((left, right) => {
    if (left.assignment.active !== right.assignment.active) return left.assignment.active ? -1 : 1
    return (right.assignment.start ?? '').localeCompare(left.assignment.start ?? '')
  })
}

function formatCareerPeriod(start: string | null, end: string | null, active: boolean): string {
  const startYear = start?.slice(0, 4) ?? '–'
  const endYear = active ? 'Now' : (end?.slice(0, 4) ?? '–')
  return `${startYear}–${endYear}`
}

function formatCareerDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00Z`)
  )
}

function formatBirthDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00Z`))
}

function CoachPageSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}

function MissingCoach({ message = 'Coach not found.' }: { message?: string }): React.JSX.Element {
  return <div className="p-10 text-sm text-muted-foreground">{message}</div>
}
