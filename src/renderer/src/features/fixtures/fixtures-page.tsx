import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react'
import type { CachedFixture } from '@/data/db'
import { useFixtures } from './use-fixtures'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamLogo } from '@/features/competitions/team-logo'
import { cn } from '@/lib/utils'
import { currentTimeZone, formatFixtureTime, todayInTimeZone } from '@/lib/date'
import { useOnline } from '@/lib/use-online'

interface FixturesPageProps {
  date: string
}

export function FixturesPage({ date }: FixturesPageProps): React.JSX.Element {
  const navigate = useNavigate({ from: '/' })
  const timeZone = useMemo(() => currentTimeZone(), [])
  const online = useOnline()
  const { cached, refreshing, error, refresh } = useFixtures(date, timeZone, true)
  const groupedFixtures = useMemo(() => groupFixtures(cached?.fixtures ?? []), [cached?.fixtures])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-7 lg:p-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Matchday</h1>
        </div>

        <div className="flex items-center gap-2">
          <Input
            aria-label="Fixture date"
            className="w-40 bg-card"
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
            variant="outline"
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
        <div className="flex flex-col gap-5">
          {groupedFixtures.map(([league, fixtures]) => (
            <section key={league} className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <div className="border-b bg-muted/45 px-4 py-3">
                <h2 className="text-sm font-semibold">{league}</h2>
              </div>
              <div className="divide-y">
                {fixtures.map((fixture) => (
                  <FixtureRow key={fixture.id} fixture={fixture} online={online} />
                ))}
              </div>
            </section>
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
      className="grid grid-cols-[5rem_1fr_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/45"
    >
      <time className="text-sm tabular-nums text-muted-foreground">
        {formatFixtureTime(fixture.startingAt)}
      </time>
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamLogo
            className="size-7 bg-background"
            imagePath={home?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm font-medium">
            {home?.name ?? fixture.name ?? 'Home team'}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamLogo
            className="size-7 bg-background"
            imagePath={away?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm text-muted-foreground">{away?.name ?? 'Away team'}</p>
        </div>
      </div>
      <div className="text-right">
        {hasScore ? (
          <div className="grid grid-rows-2 gap-0.5 text-sm font-semibold tabular-nums">
            <span>{homeScore ?? '–'}</span>
            <span>{awayScore ?? '–'}</span>
          </div>
        ) : (
          <Badge variant="outline">{fixture.raw.state?.short_name ?? 'Scheduled'}</Badge>
        )}
      </div>
    </Link>
  )
}

function FixtureListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-5">
      {[0, 1].map((section) => (
        <div key={section} className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-4">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-4 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-5">
                <Skeleton className="h-4 w-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
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
