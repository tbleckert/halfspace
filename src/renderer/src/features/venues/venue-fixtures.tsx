import { RefreshCw } from 'lucide-react'
import type { RefreshVenueFixturesInput } from '@shared/contracts'
import type { CachedFixture } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorAlert } from '@/components/error-alert'
import { EntityFixtureRow } from '@/features/fixtures/entity-fixture-panel'
import { isFixtureOngoing } from '@/lib/fixture-state'
import { useVenueFixtures } from './use-venue'
import { useCurrentTime } from '@/lib/use-current-time'

export function VenueFixtures({
  input,
  date,
  online
}: {
  input: RefreshVenueFixturesInput
  date: string
  online: boolean
}): React.JSX.Element {
  const { cached, refreshing, error, refresh } = useVenueFixtures(input, online)
  const now = useCurrentTime()
  const fixtures = (cached?.fixtures ?? [])
    .filter(
      (fixture): fixture is CachedFixture & { startingAt: number } =>
        !fixture.placeholder && fixture.startingAt !== null
    )
    .toSorted((left, right) => left.startingAt - right.startingAt)
  const recent = fixtures
    .filter(({ stateId, startingAt }) => [5, 7, 8].includes(stateId) && startingAt <= now)
    .reverse()
    .slice(0, 5)
  const upcoming = fixtures
    .filter(({ stateId, startingAt }) => stateId === 1 && startingAt > now)
    .slice(0, 5)
  const ongoing = fixtures.filter(({ stateId }) => isFixtureOngoing(stateId))
  return (
    <section aria-label="Venue matches" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Matches</h2>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            {formatWindowDate(input.startDate)} – {formatWindowDate(input.endDate)}
          </p>
        </div>
        <Button
          aria-label="Refresh venue matches"
          size="icon"
          variant="outline"
          disabled={!online || refreshing}
          onClick={() => void refresh()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {!cached ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {cached === undefined || refreshing
              ? 'Loading matches…'
              : online
                ? 'Matches unavailable'
                : 'Matches not available offline'}
          </CardContent>
        </Card>
      ) : (
        <>
          {ongoing.length > 0 && (
            <VenueMatchGroup label="In progress" fixtures={ongoing} date={date} online={online} />
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            <VenueMatchGroup
              label="Recent results"
              emptyLabel="No recent results in this window"
              fixtures={recent}
              date={date}
              online={online}
            />
            <VenueMatchGroup
              label="Upcoming"
              emptyLabel="No upcoming matches in this window"
              fixtures={upcoming}
              date={date}
              online={online}
            />
          </div>
        </>
      )}
    </section>
  )
}

function VenueMatchGroup({
  label,
  emptyLabel,
  fixtures,
  date,
  online
}: {
  label: string
  emptyLabel?: string
  fixtures: CachedFixture[]
  date: string
  online: boolean
}): React.JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      {fixtures.length ? (
        <div className="space-y-2 px-2 pb-2">
          {fixtures.map((fixture) => (
            <EntityFixtureRow
              key={fixture.id}
              fixture={fixture}
              context={{ competition: fixture.leagueId, season: fixture.seasonId, date }}
              dateDisplay="full"
              fixtureSeasonLinks={false}
              showCompetition
              online={online}
            />
          ))}
        </div>
      ) : (
        <CardContent className="pb-6 text-sm text-muted-foreground">{emptyLabel}</CardContent>
      )}
    </Card>
  )
}

function formatWindowDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T12:00:00Z`))
}
