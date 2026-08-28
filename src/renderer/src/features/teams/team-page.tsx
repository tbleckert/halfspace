import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertCircle, ArrowLeft, RefreshCw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CachedCompetition, CachedStanding } from '@/data/db'
import { db, readTeamStandings } from '@/data/db'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { splitEntityFixtures } from '@/features/fixtures/entity-fixture-data'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'
import { addDaysToIsoDate, currentTimeZone, todayInTimeZone } from '@/lib/date'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { TeamLogo } from './team-logo'
import { useTeamEntity, useTeamFixtures } from './use-team'

interface TeamCompetitionContext {
  competition: CachedCompetition
  standing: CachedStanding | null
}

export function TeamPage({
  competitionId,
  teamId
}: {
  competitionId?: number
  teamId: string
}): React.JSX.Element {
  const parsedTeamId = Number(teamId)
  const validTeamId = Number.isSafeInteger(parsedTeamId) && parsedTeamId > 0
  const online = useOnline()
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone])
  const fixtureInput = useMemo(
    () =>
      validTeamId
        ? {
            teamId: parsedTeamId,
            startDate: addDaysToIsoDate(today, -30),
            endDate: addDaysToIsoDate(today, 30),
            timeZone
          }
        : null,
    [parsedTeamId, timeZone, today, validTeamId]
  )
  const [pageOpenedAt] = useState(() => Date.now())
  const team = useTeamEntity(validTeamId ? parsedTeamId : null, online)
  const fixtures = useTeamFixtures(fixtureInput, online)
  const competitionContexts = useLiveQuery(
    () =>
      validTeamId ? readTeamCompetitionContexts(parsedTeamId, competitionId) : Promise.resolve([]),
    [competitionId, parsedTeamId, validTeamId]
  )
  const fixtureSections = useMemo(
    () => splitEntityFixtures(fixtures.cached?.fixtures ?? [], pageOpenedAt),
    [fixtures.cached?.fixtures, pageOpenedAt]
  )
  const refreshing = team.refreshing || fixtures.refreshing
  const errors = [team.error, fixtures.error].filter((error): error is string => Boolean(error))
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
    await Promise.all([team.refresh(), fixtures.refresh()])
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {[
                    detailedTeam.country?.name,
                    detailedTeam.founded ? `Founded ${detailedTeam.founded}` : null,
                    detailedTeam.venue?.name
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
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
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.join(' ')}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,0.65fr)_minmax(24rem,1.35fr)]">
        <TeamCompetitions contexts={competitionContexts} online={online} />

        <div className="flex flex-col gap-5">
          {fixtures.cached === undefined ? (
            <FixturesSkeleton />
          ) : (
            <>
              <EntityFixturePanel
                context={{ competition: competitionId, team: parsedTeamId }}
                fixtures={fixtureSections.upcoming}
                label="Upcoming"
                loading={fixtures.refreshing}
                online={online}
                showCompetition
              />
              <EntityFixturePanel
                context={{ competition: competitionId, team: parsedTeamId }}
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
    </div>
  )
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
