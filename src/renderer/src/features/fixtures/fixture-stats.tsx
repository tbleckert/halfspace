import { FixtureStatTeam } from './fixture-stat-team'
import { FixtureExpectedMetrics } from './fixture-expected-metrics'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { ErrorAlert } from '@/components/error-alert'
import { fixtureParticipantAt } from '@/lib/fixture'
import { isFixtureOngoing } from '@/lib/fixture-state'
import { usePeriodStatistics } from './use-period-statistics'
import { Card } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { intentPrefetchProps } from '@/lib/prefetch'
import type { SportmonksFixture, SportmonksParticipant } from '@shared/contracts'
import { Link } from '@tanstack/react-router'
import {
  fixturePlayerPerformances,
  fixtureStatisticRows,
  formatPlayerRating,
  type PlayerPerformance
} from './fixture-detail-data'
import { FixtureEmptyState } from './fixture-empty-state'
import { FixtureStatisticRow } from './fixture-statistic-row'
import type { FixturePlayerContext } from './fixture-route'

export function FixtureStats({
  fixture,
  context,
  online,
  periodId,
  onSelectPeriod
}: {
  fixture: SportmonksFixture
  context: FixturePlayerContext
  online: boolean
  periodId?: number
  onSelectPeriod: (periodId?: number) => void
}): React.JSX.Element {
  const home = fixtureParticipantAt(fixture, 'home')
  const away = fixtureParticipantAt(fixture, 'away')
  const lineups = fixture.lineups ?? []
  const query = usePeriodStatistics(
    fixture.id,
    online && periodId !== undefined,
    isFixtureOngoing(fixture.state_id)
  )
  const periods = [...(fixture.periods ?? query.cached?.periods ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )
  const period = query.cached?.periods.find((period) => period.id === periodId)
  const statistics =
    periodId === undefined ? (fixture.statistics ?? []) : (period?.statistics ?? [])
  const rows = fixtureStatisticRows(statistics)
  const performances = fixturePlayerPerformances(lineups)
  const homePerformances = performances.filter(({ entry }) => entry.team_id === home?.id)
  const awayPerformances = performances.filter(({ entry }) => entry.team_id === away?.id)

  return (
    <div className="flex flex-col gap-5">
      {periodId === undefined && <FixtureExpectedMetrics fixture={fixture} online={online} />}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5">
          <h2 className="text-base font-semibold">Match statistics</h2>
          <div className="flex items-center gap-2">
            <NativeSelect
              aria-label="Statistics period"
              value={periodId ?? ''}
              onChange={(event) =>
                onSelectPeriod(event.target.value ? Number(event.target.value) : undefined)
              }
            >
              <option value="">Full match</option>
              {periodId !== undefined && !periods.some((period) => period.id === periodId) && (
                <option value={periodId} disabled>
                  Selected period unavailable
                </option>
              )}
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.description}
                </option>
              ))}
            </NativeSelect>
            {periodId !== undefined && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Refresh period statistics"
                disabled={!online || query.refreshing}
                onClick={() => void query.refresh()}
              >
                <RefreshCw className="size-4" />
              </Button>
            )}
          </div>
        </div>
        {periodId !== undefined && query.error && (
          <div className="px-4 pt-3">
            <ErrorAlert>{query.error}</ErrorAlert>
          </div>
        )}
        <div className="grid grid-cols-[1fr_minmax(8rem,1.5fr)_1fr] items-center px-4 pb-3 pt-5">
          <FixtureStatTeam participant={home} online={online} align="left" />
          <span />
          <FixtureStatTeam participant={away} online={online} align="right" />
        </div>
        {rows.length === 0 ? (
          <FixtureEmptyState>
            {periodId === undefined
              ? 'Stats not available'
              : query.cached
                ? 'No statistics reported for this period'
                : query.error
                  ? 'Period statistics unavailable'
                  : !online
                    ? 'Period statistics not available offline'
                    : 'Loading period statistics…'}
          </FixtureEmptyState>
        ) : (
          <div className="space-y-2 pb-2">
            {rows.map((row) => (
              <FixtureStatisticRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </Card>

      {performances.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Player performance
            {periodId !== undefined && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">Full match</span>
            )}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamPlayerPerformance
              context={context}
              online={online}
              participant={home}
              performances={homePerformances}
            />
            <TeamPlayerPerformance
              context={context}
              online={online}
              participant={away}
              performances={awayPerformances}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function TeamPlayerPerformance({
  context,
  online,
  participant,
  performances
}: {
  context: FixturePlayerContext
  online: boolean
  participant?: SportmonksParticipant
  performances: PlayerPerformance[]
}): React.JSX.Element {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 pb-3 pt-5">
        <FixtureStatTeam align="left" online={online} participant={participant} />
      </div>
      {performances.length === 0 ? (
        <FixtureEmptyState>Player stats not available</FixtureEmptyState>
      ) : (
        <div className="space-y-2 pb-2">
          {performances.map((performance) => (
            <PlayerPerformanceRow
              key={performance.entry.id}
              context={context}
              online={online}
              performance={performance}
              teamId={participant?.id}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

function PlayerPerformanceRow({
  context,
  online,
  performance,
  teamId
}: {
  context: FixturePlayerContext
  online: boolean
  performance: PlayerPerformance
  teamId?: number
}): React.JSX.Element {
  const { entry, metrics, minutes, rating } = performance

  return (
    <Link
      to="/players/$playerId"
      params={{ playerId: String(entry.player_id) }}
      search={{ ...context, team: teamId }}
      className="block px-4 py-3 outline-none hover:bg-muted/45 focus-visible:bg-muted/45"
      {...intentPrefetchProps(online, () => prefetchPlayerEntity(entry.player_id))}
    >
      <div className="flex items-center gap-3">
        <PlayerPhoto
          className="size-10 rounded-full bg-portrait text-portrait-foreground shadow-xs"
          imagePath={entry.player?.image_path ?? null}
          online={online}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.player_name}</p>
          <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
            #{entry.jersey_number ?? '–'}
            {minutes !== null && ` · ${minutes} min`}
          </p>
        </div>
        <div className="min-w-10 text-right">
          <p className="font-mono text-lg font-semibold tabular-nums">
            {rating === null ? '–' : formatPlayerRating(rating)}
          </p>
          <p className="text-[10px] text-muted-foreground">Rating</p>
        </div>
      </div>
      {metrics.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 pt-2.5">
          {metrics.map((metric) => (
            <div key={metric.typeId} className="min-w-0">
              <p className="font-mono text-sm font-semibold tabular-nums">{metric.value}</p>
              <p className="truncate text-[10px] text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      )}
    </Link>
  )
}
