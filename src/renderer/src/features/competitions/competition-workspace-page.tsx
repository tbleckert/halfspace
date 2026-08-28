import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react'
import type { CachedFixture, CachedStanding } from '@/data/db'
import { db } from '@/data/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useOnline } from '@/lib/use-online'
import { CompetitionLogo } from './competition-logo'
import {
  groupStandings,
  nearestFixtureSeasonId,
  splitCompetitionFixtures
} from './competition-workspace-data'
import { TeamLogo } from './team-logo'
import { useCompetitionFixtures, useStandings } from './use-competition-workspace'

export function CompetitionWorkspacePage({
  competitionId
}: {
  competitionId: string
}): React.JSX.Element {
  const parsedCompetitionId = Number(competitionId)
  const validCompetitionId = Number.isSafeInteger(parsedCompetitionId) && parsedCompetitionId > 0
  const competition = useLiveQuery(
    async () =>
      validCompetitionId ? ((await db.competitions.get(parsedCompetitionId)) ?? null) : null,
    [parsedCompetitionId, validCompetitionId]
  )
  const online = useOnline()
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone])
  const fixtureInput = useMemo(
    () =>
      validCompetitionId
        ? {
            competitionId: parsedCompetitionId,
            startDate: addDaysToIsoDate(today, -14),
            endDate: addDaysToIsoDate(today, 14),
            timeZone
          }
        : null,
    [parsedCompetitionId, timeZone, today, validCompetitionId]
  )
  const [workspaceOpenedAt] = useState(() => Date.now())
  const fixtures = useCompetitionFixtures(fixtureInput, online)
  const observedSeasonId = useMemo(
    () => nearestFixtureSeasonId(fixtures.cached?.fixtures ?? [], workspaceOpenedAt),
    [fixtures.cached?.fixtures, workspaceOpenedAt]
  )
  const seasonId = competition?.currentSeasonId ?? observedSeasonId
  const standings = useStandings(seasonId, online)
  const standingGroups = useMemo(
    () => groupStandings(standings.cached?.standings ?? []),
    [standings.cached?.standings]
  )
  const fixtureSections = useMemo(
    () => splitCompetitionFixtures(fixtures.cached?.fixtures ?? [], workspaceOpenedAt),
    [fixtures.cached?.fixtures, workspaceOpenedAt]
  )
  const refreshing = standings.refreshing || fixtures.refreshing
  const errors = [standings.error, fixtures.error].filter((error): error is string =>
    Boolean(error)
  )

  if (competition === undefined) return <CompetitionWorkspaceSkeleton />
  if (!competition) return <MissingCompetition />

  async function refresh(): Promise<void> {
    await Promise.all([standings.refresh(), fixtures.refresh()])
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-7 lg:p-10">
      <header className="flex items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <CompetitionLogo
            className="size-16 rounded-xl bg-card shadow-xs"
            imagePath={competition.imagePath}
            online={online}
          />
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{competition.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[competition.raw.country?.name, competition.currentSeasonName]
                .filter(Boolean)
                .join(' · ')}
            </p>
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

      {errors.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.join(' ')}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="flex flex-col gap-4">
          {standings.cached === undefined ? (
            <StandingsSkeleton />
          ) : seasonId === null ? (
            <EmptyPanel icon={<Trophy className="size-6" />} label="No current season" />
          ) : standingGroups.length === 0 ? (
            <EmptyPanel
              icon={<Trophy className="size-6" />}
              label={standings.refreshing ? 'Loading table…' : 'No table'}
            />
          ) : (
            standingGroups.map((group) => (
              <StandingsTable
                key={group.key}
                name={standingGroups.length === 1 ? 'Table' : group.name}
                online={online}
                standings={group.standings}
              />
            ))
          )}
        </div>

        <div className="flex flex-col gap-5">
          {fixtures.cached === undefined ? (
            <FixturesSkeleton />
          ) : (
            <>
              <FixturePanel
                competitionId={competition.id}
                fixtures={fixtureSections.upcoming}
                label="Upcoming"
                loading={fixtures.refreshing}
              />
              <FixturePanel
                competitionId={competition.id}
                fixtures={fixtureSections.recent}
                label="Recent"
                loading={fixtures.refreshing}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StandingsTable({
  name,
  online,
  standings
}: {
  name: string
  online: boolean
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
                <div className="flex min-w-0 items-center gap-2.5">
                  <TeamLogo
                    className="size-7 bg-background"
                    imagePath={standing.raw.participant?.image_path ?? null}
                    online={online}
                  />
                  <span className="truncate font-medium">
                    {standing.raw.participant?.name ?? `Team ${standing.participantId}`}
                  </span>
                </div>
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

function FixturePanel({
  competitionId,
  fixtures,
  label,
  loading
}: {
  competitionId: number
  fixtures: CachedFixture[]
  label: string
  loading: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{label}</h2>
      </div>
      {fixtures.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center px-4 text-sm text-muted-foreground">
          {loading ? 'Loading fixtures…' : 'No fixtures'}
        </div>
      ) : (
        <div className="divide-y">
          {fixtures.map((fixture) => (
            <CompetitionFixtureRow
              key={fixture.id}
              competitionId={competitionId}
              fixture={fixture}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CompetitionFixtureRow({
  competitionId,
  fixture
}: {
  competitionId: number
  fixture: CachedFixture
}): React.JSX.Element {
  const home = fixture.raw.participants.find(({ meta }) => meta?.location === 'home')
  const away = fixture.raw.participants.find(({ meta }) => meta?.location === 'away')
  const scores = fixture.raw.scores.filter(({ description }) => description === 'CURRENT')
  const homeScore = scores.find(({ score }) => score.participant === 'home')?.score.goals
  const awayScore = scores.find(({ score }) => score.participant === 'away')?.score.goals
  const hasScore = homeScore !== undefined || awayScore !== undefined

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={{ competition: competitionId }}
      className="block px-4 py-3.5 transition-colors hover:bg-muted/45"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <time>{formatFixtureDate(fixture.startingAt)}</time>
        {!hasScore && (
          <Badge variant="outline">{fixture.raw.state?.short_name ?? 'Scheduled'}</Badge>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        <span className="truncate font-medium">{home?.name ?? fixture.name ?? 'Home team'}</span>
        <span className="font-semibold tabular-nums">{hasScore ? (homeScore ?? '–') : ''}</span>
        <span className="truncate text-muted-foreground">{away?.name ?? 'Away team'}</span>
        <span className="font-semibold tabular-nums">{hasScore ? (awayScore ?? '–') : ''}</span>
      </div>
    </Link>
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

function formatFixtureDate(timestamp: number | null): string {
  if (timestamp === null) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}
