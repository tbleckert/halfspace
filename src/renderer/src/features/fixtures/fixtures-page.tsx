import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react'
import type { CachedFixture } from '@/data/db'
import { prefetchFixtureEntity, useFixtures } from './use-fixtures'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { fixtureRowStatus } from '@/lib/fixture-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { useCompetitions } from '@/features/competitions/use-competitions'
import { TeamLogo } from '@/features/teams/team-logo'
import { cn } from '@/lib/utils'
import { currentTimeZone, formatFixtureTime, todayInTimeZone } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useOnline } from '@/lib/use-online'

interface FixturesPageProps {
  date: string
}

export function FixturesPage({ date }: FixturesPageProps): React.JSX.Element {
  const navigate = useNavigate({ from: '/' })
  const timeZone = useMemo(() => currentTimeZone(), [])
  const online = useOnline()
  const { cached, refreshing, error, refresh } = useFixtures(date, timeZone, true)
  const { cached: competitionCatalog } = useCompetitions(false)
  const groupedFixtures = useMemo(() => groupFixtures(cached?.fixtures ?? []), [cached?.fixtures])
  const competitionImagePaths = useMemo(
    () =>
      new Map(
        (competitionCatalog?.competitions ?? []).map((competition) => [
          competition.id,
          competition.imagePath
        ])
      ),
    [competitionCatalog?.competitions]
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <h1 className="text-4xl font-extrabold tracking-[-0.045em] text-brand-navy">Matchday</h1>

        <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5 shadow-xs">
          <Input
            aria-label="Fixture date"
            className="w-40 border-0 bg-transparent font-semibold text-brand-navy shadow-none focus-visible:ring-0"
            type="date"
            value={date}
            onChange={(event) => {
              void navigate({
                search: (previous) => ({ ...previous, date: event.target.value }),
                replace: true
              })
            }}
          />
          <Button
            aria-label="Refresh fixtures"
            disabled={refreshing}
            size="icon"
            variant="ghost"
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {cached === undefined ? (
        <FixtureListSkeleton />
      ) : groupedFixtures.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <CalendarDays className="mb-3 size-7 text-muted-foreground" />
            <p className="font-medium">{refreshing ? 'Loading fixtures…' : 'No fixtures'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedFixtures.map(([league, fixtures]) => (
            <Card key={league} className="overflow-hidden border-border/60 shadow-none">
              <CardHeader className="border-b px-4 py-3">
                <Link
                  to="/competitions/$competitionId"
                  params={{ competitionId: String(fixtures[0].leagueId) }}
                  search={{ date, season: fixtures[0].seasonId }}
                  className="flex w-fit items-center gap-2.5 rounded-md outline-none transition-colors hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue"
                  {...intentPrefetchProps(online, () =>
                    prefetchCompetitionWorkspace(fixtures[0].leagueId)
                  )}
                >
                  <CompetitionLogo
                    className="size-6 bg-background"
                    imagePath={competitionImagePaths.get(fixtures[0].leagueId) ?? null}
                    online={online}
                  />
                  <CardTitle>{league}</CardTitle>
                </Link>
              </CardHeader>
              <div className="divide-y">
                {fixtures.map((fixture) => (
                  <FixtureRow key={fixture.id} fixture={fixture} online={online} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {date !== todayInTimeZone(timeZone) && (
        <button
          className="self-start text-sm font-medium text-primary hover:underline"
          onClick={() =>
            void navigate({
              search: (previous) => ({ ...previous, date: todayInTimeZone(timeZone) })
            })
          }
        >
          Return to today
        </button>
      )}
    </div>
  )
}

function FixtureRow({
  fixture,
  online
}: {
  fixture: CachedFixture
  online: boolean
}): React.JSX.Element {
  const home = fixture.raw.participants.find((participant) => participant.meta?.location === 'home')
  const away = fixture.raw.participants.find((participant) => participant.meta?.location === 'away')
  const currentScores = fixture.raw.scores.filter((score) => score.description === 'CURRENT')
  const homeScore = currentScores.find((score) => score.score.participant === 'home')?.score.goals
  const awayScore = currentScores.find((score) => score.score.participant === 'away')?.score.goals
  const hasScore = homeScore !== undefined || awayScore !== undefined

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={true}
      className="grid grid-cols-[4rem_minmax(0,1fr)_2rem] items-center gap-4 px-4 py-3 outline-none transition-colors hover:bg-brand-blue/[0.08] focus-visible:bg-brand-blue/[0.08]"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <FixtureRowStatus fixture={fixture} />
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={home?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm font-semibold text-foreground">
            {home?.name ?? fixture.name ?? 'Home team'}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={away?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm font-medium text-foreground/75">
            {away?.name ?? 'Away team'}
          </p>
        </div>
      </div>
      <div className="grid grid-rows-2 gap-0.5 text-right text-base font-extrabold tabular-nums text-brand-navy">
        {hasScore && (
          <>
            <span>{homeScore ?? '–'}</span>
            <span>{awayScore ?? '–'}</span>
          </>
        )}
      </div>
    </Link>
  )
}

function FixtureRowStatus({ fixture }: { fixture: CachedFixture }): React.JSX.Element {
  const status = fixtureRowStatus(fixture.raw)

  if (status.kind === 'in-play') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm font-semibold tabular-nums text-emerald-600">
        <FixtureLiveIndicator showLabel={false} />
        <span>{status.label}</span>
      </div>
    )
  }

  if (status.kind === 'state') {
    return (
      <span className="text-center text-xs font-bold tracking-[0.08em] tabular-nums text-muted-foreground">
        {status.label}
      </span>
    )
  }

  return (
    <time className="text-center text-sm font-semibold tabular-nums text-brand-navy/70">
      {formatFixtureTime(fixture.startingAt)}
    </time>
  )
}

function FixtureListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-5">
      {[0, 1].map((section) => (
        <Card key={section} className="overflow-hidden border-border/60 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-4 w-36" />
            </div>
          </CardHeader>
          <div className="divide-y">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function groupFixtures(fixtures: CachedFixture[]): Array<[string, CachedFixture[]]> {
  const groups = new Map<string, CachedFixture[]>()

  for (const fixture of fixtures) {
    const league = fixture.raw.league?.name ?? `League ${fixture.leagueId}`
    const group = groups.get(league) ?? []
    group.push(fixture)
    groups.set(league, group)
  }

  return [...groups.entries()]
}
