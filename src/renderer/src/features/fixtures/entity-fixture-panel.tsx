import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import type { CachedFixture } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { FixtureLiveIndicator } from './fixture-live-indicator'
import { fixtureProgressLabel } from '@/lib/fixture-state'

interface FixtureContext {
  competition?: number
  team?: number
}

export function EntityFixturePanel({
  context,
  fixtures,
  label,
  loading,
  online,
  showCompetition = false
}: {
  context: FixtureContext
  fixtures: CachedFixture[]
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
          {loading ? 'Loading fixtures…' : 'No fixtures'}
        </div>
      ) : (
        <div className="divide-y">
          {fixtures.map((fixture) => (
            <EntityFixtureRow
              key={fixture.id}
              context={context}
              fixture={fixture}
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
  fixture,
  online,
  showCompetition
}: {
  context: FixtureContext
  fixture: CachedFixture
  online: boolean
  showCompetition: boolean
}): React.JSX.Element {
  const home = fixture.raw.participants.find(({ meta }) => meta?.location === 'home')
  const away = fixture.raw.participants.find(({ meta }) => meta?.location === 'away')
  const scores = fixture.raw.scores.filter(({ description }) => description === 'CURRENT')
  const homeScore = scores.find(({ score }) => score.participant === 'home')?.score.goals
  const awayScore = scores.find(({ score }) => score.participant === 'away')?.score.goals
  const hasScore = homeScore !== undefined || awayScore !== undefined
  const progressLabel = fixtureProgressLabel(fixture.raw)

  return (
    <Link
      to="/fixtures/$fixtureId"
      params={{ fixtureId: String(fixture.id) }}
      search={context}
      className="block px-4 py-3.5 transition-colors hover:bg-muted/45"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          {progressLabel ? (
            <span className="flex shrink-0 flex-col items-center gap-1">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {progressLabel}
              </span>
              <FixtureLiveIndicator showLabel={false} />
            </span>
          ) : (
            <time className="shrink-0">{formatFixtureDate(fixture.startingAt)}</time>
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
          <Badge className="shrink-0" variant="outline">
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
        <span className="font-semibold tabular-nums">{hasScore ? (homeScore ?? '–') : ''}</span>
        <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
          <TeamLogo
            className="size-6 bg-background"
            imagePath={away?.image_path ?? null}
            online={online}
          />
          <span className="truncate">{away?.name ?? 'Away team'}</span>
        </span>
        <span className="font-semibold tabular-nums">{hasScore ? (awayScore ?? '–') : ''}</span>
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
