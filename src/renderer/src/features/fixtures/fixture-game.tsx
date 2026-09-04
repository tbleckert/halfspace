import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { FixturePressureQuery, FixtureTrendsQuery } from '@/data/db'
import { TeamLogo } from '@/features/teams/team-logo'
import { fixtureParticipantAt } from '@/lib/fixture'
import { cn } from '@/lib/utils'
import type { SportmonksFixture } from '@shared/contracts'
import { fixtureKeyStatisticRows } from './fixture-detail-data'
import { FixtureEmptyState } from './fixture-empty-state'
import { FixtureTrends } from './fixture-trends'
import { FixturePressure } from './fixture-pressure'
import type { FixtureDetailSearch } from './fixture-route'
import { FixtureStatisticRow } from './fixture-statistic-row'
import { FixtureTimeline } from './fixture-timeline'

export function FixtureGame({
  fixture,
  context,
  pressure,
  trends,
  online
}: {
  fixture: SportmonksFixture
  context: FixtureDetailSearch
  pressure: FixturePressureQuery | null | undefined
  trends?: FixtureTrendsQuery | null
  online: boolean
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture, 'home')
  const away = fixtureParticipantAt(fixture, 'away')
  const rows = fixtureKeyStatisticRows(fixture.statistics ?? [])
  const hasPressure = pressure?.points.some(
    (point) => point.participant_id === home?.id || point.participant_id === away?.id
  )

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn('grid gap-5', hasPressure && 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}
      >
        {hasPressure && (
          <FixturePressure
            key={fixture.id}
            cached={pressure}
            home={home}
            away={away}
            events={fixture.events ?? []}
            online={online}
          />
        )}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Key stats</CardTitle>
            <Link
              to="/fixtures/$fixtureId/stats"
              params={{ fixtureId: String(fixture.id) }}
              search={context}
              className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Full stats
            </Link>
          </CardHeader>
          {rows.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-4 px-4 text-xs font-medium">
                {[home, away].map((participant, index) => (
                  <div key={index} className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-2 shrink-0 rounded-sm',
                        index === 0 ? 'bg-chart-1' : 'bg-chart-5'
                      )}
                    />
                    <TeamLogo
                      className="size-5"
                      imagePath={participant?.image_path ?? null}
                      online={online}
                    />
                    <span className="truncate">
                      {participant?.name ?? (index === 0 ? 'Home' : 'Away')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="divide-y">
                {rows.map((row) => (
                  <FixtureStatisticRow
                    key={row.id}
                    row={row}
                    percentage={row.id === 45}
                    className="py-3 text-xs"
                  />
                ))}
              </div>
            </>
          ) : (
            <FixtureEmptyState>Stats not available</FixtureEmptyState>
          )}
        </Card>
      </div>
      <FixtureTrends cached={trends} home={home} away={away} />
      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Timeline</h2>
        <FixtureTimeline home={home} away={away} events={fixture.events ?? []} online={online} />
      </section>
    </div>
  )
}
