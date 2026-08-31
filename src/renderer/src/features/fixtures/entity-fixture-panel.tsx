import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import type { CachedFixture } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { fixtureProgressLabel } from '@/lib/fixture-state'
import { formatFixtureTime } from '@/lib/date'
import { currentFixtureScore, fixtureParticipantAt } from '@/lib/fixture'
import { intentPrefetchProps } from '@/lib/prefetch'
import { prefetchFixtureEntity } from './use-fixtures'

interface FixtureContext {
  competition?: number
  date?: string
  season?: number
  team?: number
}

export function EntityFixturePanel({
  context,
  fixtures,
  label,
  loading,
  online,
  dateDisplay = 'full',
  emptyLabel = 'No fixtures',
  fixtureSeasonLinks = false,
  showCompetition = false
}: {
  context: FixtureContext
  dateDisplay?: 'full' | 'historical' | 'time'
  emptyLabel?: string
  fixtures: CachedFixture[]
  fixtureSeasonLinks?: boolean
  label: string
  loading: boolean
  online: boolean
  showCompetition?: boolean
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{label}</h2>
      </div>
      {fixtures.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center px-4 text-sm text-muted-foreground">
          {loading ? 'Loading fixtures…' : emptyLabel}
        </div>
      ) : (
        <div className="divide-y">
          {fixtures.map((fixture) => (
            <EntityFixtureRow
              key={fixture.id}
              context={context}
              dateDisplay={dateDisplay}
              fixture={fixture}
              fixtureSeasonLinks={fixtureSeasonLinks}
              online={online}
              showCompetition={showCompetition}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function EntityFixtureRow({
  context,
  dateDisplay,
  fixture,
  fixtureSeasonLinks,
  online,
  showCompetition
}: {
  context: FixtureContext
  dateDisplay: 'full' | 'historical' | 'time'
  fixture: CachedFixture
  fixtureSeasonLinks: boolean
  online: boolean
  showCompetition: boolean
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture.raw, 'home')
  const away = fixtureParticipantAt(fixture.raw, 'away')
  const { home: homeScore, away: awayScore } = currentFixtureScore(fixture.raw)
  const hasScore = homeScore !== undefined || awayScore !== undefined
  const progressLabel = fixtureProgressLabel(fixture.raw)

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={fixtureSeasonLinks ? { ...context, season: fixture.seasonId } : context}
      className="block px-4 py-3.5 transition-colors hover:bg-muted/45"
      {...intentPrefetchProps(online, () => prefetchFixtureEntity(fixture.id))}
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          {progressLabel ? (
            <span className="flex shrink-0 flex-col items-center gap-1">
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {progressLabel}
              </span>
              <FixtureLiveIndicator showLabel={false} />
            </span>
          ) : (
            <time className="shrink-0 font-mono tabular-nums">
              {dateDisplay === 'time' && formatFixtureTime(fixture.startingAt)}
              {dateDisplay === 'full' && formatFixtureDate(fixture.startingAt)}
              {dateDisplay === 'historical' && formatHistoricalFixtureDate(fixture.startingAt)}
            </time>
          )}
          {showCompetition && (
            <>
              <span>·</span>
              <span className="truncate">
                {fixture.raw.league?.name ?? `League ${fixture.leagueId}`}
              </span>
            </>
          )}
        </div>
        {!hasScore && (
          <Badge className="shrink-0 font-mono" variant="outline">
            {fixture.raw.state?.short_name ?? 'Scheduled'}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        <span className="flex min-w-0 items-center gap-2.5 font-medium">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={home?.image_path ?? null}
            online={online}
          />
          <span className="truncate">{home?.name ?? fixture.name ?? 'Home team'}</span>
        </span>
        <span className="font-mono font-semibold tabular-nums">
          {hasScore ? (homeScore ?? '–') : ''}
        </span>
        <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={away?.image_path ?? null}
            online={online}
          />
          <span className="truncate">{away?.name ?? 'Away team'}</span>
        </span>
        <span className="font-mono font-semibold tabular-nums">
          {hasScore ? (awayScore ?? '–') : ''}
        </span>
      </div>
    </Link>
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

function formatHistoricalFixtureDate(timestamp: number | null): string {
  if (timestamp === null) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}
