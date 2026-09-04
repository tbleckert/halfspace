import { Link } from '@tanstack/react-router'
import type { CachedFixture } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { fixtureProgressLabel } from '@/lib/fixture-state'
import { intentPrefetchProps } from '@/lib/prefetch'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { liveTickerFixtures } from './live-fixture-ticker-data'
import { prefetchFixtureEntity, useLiveFixtures } from './use-fixtures'

export function LiveFixtureTicker({ timeZone }: { timeZone: string }): React.JSX.Element | null {
  const online = useOnline()
  const { cached, error } = useLiveFixtures(timeZone, online)
  const fixtures = liveTickerFixtures(cached?.fixtures ?? [])
  const current = online && !error

  if (fixtures.length === 0) return null

  return (
    <section
      aria-label={current ? 'Live scores' : 'Last seen live scores'}
      className="flex h-16 min-w-0 shrink-0 border-b border-border/70 bg-card"
    >
      <div className="flex w-28 shrink-0 items-center gap-2 border-r border-border/70 px-4">
        {current ? (
          <span aria-hidden="true">
            <FixtureLiveIndicator showLabel={false} />
          </span>
        ) : (
          <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[-0.01em]">
            {current ? 'Live now' : 'Last seen'}
          </p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {fixtures.length} {fixtures.length === 1 ? 'match' : 'matches'}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 overflow-x-auto">
        {fixtures.map((fixture) => (
          <LiveFixture key={fixture.id} fixture={fixture} online={online} />
        ))}
      </div>
    </section>
  )
}

function LiveFixture({
  fixture,
  online
}: {
  fixture: CachedFixture
  online: boolean
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  const score = currentFixtureScore(fixture.raw)
  const status = fixtureProgressLabel(fixture.raw) ?? fixture.raw.state?.short_name ?? 'Live'
  const homeName = home?.name ?? 'Home'
  const awayName = away?.name ?? 'Away'

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={{ competition: fixture.leagueId, season: fixture.seasonId }}
      aria-label={`${homeName} ${score.home ?? 'unknown'}, ${awayName} ${score.away ?? 'unknown'}, ${status}`}
      className="group flex w-64 shrink-0 flex-col justify-center border-r border-border/70 px-4 outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-medium text-muted-foreground">
        <span className="truncate">{fixture.raw.league?.name ?? `League ${fixture.leagueId}`}</span>
        <span className="shrink-0 font-mono font-semibold tabular-nums text-success-emphasis">
          {status}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <TickerTeam imagePath={home?.image_path ?? null} name={homeName} online={online} />
        <span className="font-mono text-sm font-extrabold tabular-nums text-brand-navy">
          {score.home ?? '–'}–{score.away ?? '–'}
        </span>
        <TickerTeam
          className="flex-row-reverse text-right"
          imagePath={away?.image_path ?? null}
          name={awayName}
          online={online}
        />
      </div>
    </Link>
  )
}

function TickerTeam({
  className,
  imagePath,
  name,
  online
}: {
  className?: string
  imagePath: string | null
  name: string
  online: boolean
}): React.JSX.Element {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <TeamLogo className="size-5 bg-background" imagePath={imagePath} online={online} />
      <span className="truncate text-xs font-semibold">{name}</span>
    </span>
  )
}
