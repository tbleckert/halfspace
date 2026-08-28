import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react'
import type { CachedStanding } from '@/data/db'
import { db } from '@/data/db'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'
import { splitEntityFixtures } from '@/features/fixtures/entity-fixture-data'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useOnline } from '@/lib/use-online'
import { CompetitionLogo } from './competition-logo'
import { groupStandings, nearestFixtureSeasonId } from './competition-workspace-data'
import { TeamLogo } from '@/features/teams/team-logo'
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
    () => splitEntityFixtures(fixtures.cached?.fixtures ?? [], workspaceOpenedAt),
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
                competitionId={competition.id}
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
              <EntityFixturePanel
                context={{ competition: competition.id }}
                fixtures={fixtureSections.upcoming}
                label="Upcoming"
                loading={fixtures.refreshing}
                online={online}
              />
              <EntityFixturePanel
                context={{ competition: competition.id }}
                fixtures={fixtureSections.recent}
                label="Recent"
                loading={fixtures.refreshing}
                online={online}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StandingsTable({
  competitionId,
  name,
  online,
  standings
}: {
  competitionId: number
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
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(standing.participantId) }}
                  search={{ competition: competitionId }}
                  className="flex min-w-0 items-center gap-2.5 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
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
