import { Link } from '@tanstack/react-router'
import type { CachedFixture } from '@/data/db'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { fixtureRowStatus } from '@/lib/fixture-state'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { formatFixtureTime } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { prefetchCompetitionWorkspace } from '@/features/competitions/use-competition-workspace'
import { TeamLogo } from '@/features/teams/team-logo'
import { MatchdayCard } from './matchday-card'
import { prefetchFixtureEntity } from './use-fixtures'

export function FixtureRow({
  fixture,
  date,
  online,
  context
}: {
  context?: string
  fixture: CachedFixture
  date: string
  online: boolean
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  const { home: homeScore, away: awayScore } = currentFixtureScore(fixture.raw)
  const hasScore = homeScore !== undefined || awayScore !== undefined

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={{ date }}
      className="grid grid-cols-[4rem_minmax(0,1fr)_2rem] items-center gap-4 rounded-lg px-3 py-3 outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <FixtureRowStatus fixture={fixture} />
      <div className="grid min-w-0 gap-1">
        {context && <p className="mb-1 truncate text-xs text-muted-foreground">{context}</p>}
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={home?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm font-medium text-foreground">
            {home?.name ?? fixture.name ?? 'Home team'}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={away?.image_path ?? null}
            online={online}
          />
          <p className="truncate text-sm font-medium text-foreground">
            {away?.name ?? 'Away team'}
          </p>
        </div>
      </div>
      <div className="grid grid-rows-2 gap-1 text-right font-mono text-base font-semibold tabular-nums text-foreground">
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

export function FixtureGroups({
  competitionImagePaths,
  date,
  fixtures,
  online
}: {
  competitionImagePaths: Map<number, string | null>
  date: string
  fixtures: CachedFixture[]
  online: boolean
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {groupFixtures(fixtures).map(({ leagueId, leagueName, fixtures: leagueFixtures }, index) => (
        <MatchdayCard key={`${date}-${leagueId}`} index={index} className="overflow-hidden">
          <CardHeader className="px-5 pb-3 pt-5">
            <Link
              to="/competitions/$competitionId"
              params={{ competitionId: String(leagueId) }}
              search={{ date, season: leagueFixtures[0].seasonId }}
              className="flex w-fit items-center gap-2.5 rounded-md outline-none transition-colors hover:text-sidebar-primary focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              {...intentPrefetchProps(online, () => prefetchCompetitionWorkspace(leagueId))}
            >
              <CompetitionLogo
                className="size-6 bg-background"
                imagePath={competitionImagePaths.get(leagueId) ?? null}
                online={online}
              />
              <CardTitle>{leagueName}</CardTitle>
            </Link>
          </CardHeader>
          <div className="space-y-2 px-2 pb-2">
            {leagueFixtures.map((fixture) => (
              <FixtureRow key={fixture.id} date={date} fixture={fixture} online={online} />
            ))}
          </div>
        </MatchdayCard>
      ))}
    </div>
  )
}

function FixtureRowStatus({ fixture }: { fixture: CachedFixture }): React.JSX.Element {
  const status = fixtureRowStatus(fixture.raw)

  if (status.kind === 'in-play') {
    return (
      <div className="flex items-center justify-center gap-2 font-mono text-sm font-semibold tabular-nums text-success-emphasis">
        <FixtureLiveIndicator showLabel={false} />
        <span>{status.label}</span>
      </div>
    )
  }

  if (status.kind === 'state') {
    return (
      <span className="text-center font-mono text-xs font-medium tabular-nums text-muted-foreground">
        {status.label}
      </span>
    )
  }

  return (
    <time className="text-center font-mono text-sm font-medium tabular-nums text-muted-foreground">
      {formatFixtureTime(fixture.startingAt)}
    </time>
  )
}

export function FixtureListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      {[0, 1].map((section) => (
        <Card key={section} className="overflow-hidden">
          <CardHeader className="px-5 pb-3 pt-5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-4 w-36" />
            </div>
          </CardHeader>
          <div className="space-y-2 px-2 pb-2">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="grid grid-cols-[4rem_minmax(0,1fr)_2rem] items-center gap-4 rounded-lg px-3 py-3"
              >
                <Skeleton className="h-4 w-12 justify-self-center" />
                <div className="grid min-w-0 gap-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 shrink-0" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 shrink-0" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function groupFixtures(fixtures: CachedFixture[]): Array<{
  leagueId: number
  leagueName: string
  fixtures: CachedFixture[]
}> {
  const groups = new Map<
    number,
    { leagueId: number; leagueName: string; fixtures: CachedFixture[] }
  >()

  for (const fixture of fixtures) {
    const group = groups.get(fixture.leagueId) ?? {
      leagueId: fixture.leagueId,
      leagueName: fixture.raw.league?.name ?? `League ${fixture.leagueId}`,
      fixtures: []
    }
    group.fixtures.push(fixture)
    groups.set(fixture.leagueId, group)
  }

  return [...groups.values()]
}
