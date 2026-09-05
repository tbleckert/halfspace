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
      data-slot="live-fixture-ticker"
      className="col-span-2 row-start-1 flex h-9 min-w-0 bg-card"
    >
      <div className="flex w-58 shrink-0 items-center gap-2 pl-24 pr-4">
        {current ? (
          <span aria-hidden="true" className="flex items-center">
            <FixtureLiveIndicator showLabel={false} />
          </span>
        ) : (
          <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground" />
        )}
        <p className="text-xs font-semibold">{current ? 'Live' : 'Last seen'}</p>
      </div>

      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
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
      title={`${homeName} vs ${awayName}`}
      className="grid w-52 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 px-2 outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <TickerTeam
        className="flex-row-reverse text-right"
        imagePath={home?.image_path ?? null}
        name={home?.short_code?.trim() || homeName}
        online={online}
      />
      <span className="flex items-center gap-1.5 font-mono text-sm font-bold leading-5 tabular-nums text-foreground">
        <span>{score.home ?? '–'}</span>
        <span className="flex h-5 items-center rounded-full bg-white px-1.5 text-[10px] font-bold leading-none whitespace-nowrap text-success-emphasis">
          {status}
        </span>
        <span>{score.away ?? '–'}</span>
      </span>
      <TickerTeam
        imagePath={away?.image_path ?? null}
        name={away?.short_code?.trim() || awayName}
        online={online}
      />
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
    <span className={cn('flex min-w-0 items-center gap-1', className)}>
      <TeamLogo className="size-4.5 shrink-0" imagePath={imagePath} online={online} />
      <span className="truncate text-xs font-semibold">{name}</span>
    </span>
  )
}
