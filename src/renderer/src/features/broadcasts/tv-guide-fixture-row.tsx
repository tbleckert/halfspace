import { Link } from '@tanstack/react-router'
import type { CachedFixture } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { FixtureLiveIndicator } from '@/features/fixtures/fixture-live-indicator'
import { prefetchFixtureEntity } from '@/features/fixtures/use-fixtures'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { fixtureProgressLabel } from '@/lib/fixture-state'
import { formatFixtureTime } from '@/lib/date'
import { intentPrefetchProps } from '@/lib/prefetch'

export function TvGuideFixtureRow({
  fixture,
  online,
  date
}: {
  fixture: CachedFixture
  online: boolean
  date: string
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  const score = currentFixtureScore(fixture.raw)
  const progress = fixtureProgressLabel(fixture.raw)
  const status =
    fixture.stateId === 1
      ? null
      : (progress ?? fixture.raw.state?.short_name ?? fixture.raw.state?.name)
  const showScore = fixture.stateId !== 1 && (score.home !== undefined || score.away !== undefined)
  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={{ date, competition: fixture.leagueId, season: fixture.seasonId }}
      className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg px-3 py-3.5 outline-none hover:bg-sidebar-accent focus-visible:bg-sidebar-accent"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <div className="flex flex-col items-start gap-1">
        <time
          className="font-mono text-lg font-semibold tabular-nums"
          dateTime={
            fixture.startingAt === null ? undefined : new Date(fixture.startingAt).toISOString()
          }
        >
          {formatFixtureTime(fixture.startingAt)}
        </time>
        {status && (
          <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
            {progress && <FixtureLiveIndicator showLabel={false} />}
            {status}
          </span>
        )}
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
        <span className="flex min-w-0 items-center gap-2.5 font-medium">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={home?.image_path ?? null}
            online={online}
          />
          <span className="truncate">{home?.name ?? fixture.name ?? 'Home team'}</span>
        </span>
        <span className="font-mono font-semibold tabular-nums">
          {showScore ? (score.home ?? '–') : ''}
        </span>
        <span className="flex min-w-0 items-center gap-2.5 font-medium">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={away?.image_path ?? null}
            online={online}
          />
          <span className="truncate">{away?.name ?? 'Away team'}</span>
        </span>
        <span className="font-mono font-semibold tabular-nums">
          {showScore ? (score.away ?? '–') : ''}
        </span>
      </div>
    </Link>
  )
}
