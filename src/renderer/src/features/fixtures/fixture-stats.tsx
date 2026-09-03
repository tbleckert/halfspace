import { Card } from '@/components/ui/card'
import { PlayerPhoto } from '@/features/players/player-photo'
import { prefetchPlayerEntity } from '@/features/players/use-player'
import { TeamLogo } from '@/features/teams/team-logo'
import { intentPrefetchProps } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import type { SportmonksFixture, SportmonksLineup, SportmonksParticipant } from '@shared/contracts'
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
  away,
  context,
  home,
  lineups,
  online,
  statistics
}: {
  away?: SportmonksParticipant
  context: FixturePlayerContext
  home?: SportmonksParticipant
  lineups: SportmonksLineup[]
  online: boolean
  statistics: NonNullable<SportmonksFixture['statistics']>
}): React.JSX.Element {
  const rows = fixtureStatisticRows(statistics)
  const performances = fixturePlayerPerformances(lineups)
  const homePerformances = performances.filter(({ entry }) => entry.team_id === home?.id)
  const awayPerformances = performances.filter(({ entry }) => entry.team_id === away?.id)

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_minmax(8rem,1.5fr)_1fr] items-center border-b bg-muted/25 px-4 py-3">
          <FixtureStatTeam participant={home} online={online} align="left" />
          <span />
          <FixtureStatTeam participant={away} online={online} align="right" />
        </div>
        {rows.length === 0 ? (
          <FixtureEmptyState>Stats not available</FixtureEmptyState>
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <FixtureStatisticRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </Card>

      {performances.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">Player performance</h2>
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
      <div className="border-b bg-muted/25 px-4 py-3">
        <FixtureStatTeam align="left" online={online} participant={participant} />
      </div>
      {performances.length === 0 ? (
        <FixtureEmptyState>Player stats not available</FixtureEmptyState>
      ) : (
        <div className="divide-y">
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
        <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-2.5">
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

function FixtureStatTeam({
  align,
  online,
  participant
}: {
  align: 'left' | 'right'
  online: boolean
  participant?: SportmonksParticipant
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 text-sm font-semibold',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamLogo
        className="size-7 bg-background"
        imagePath={participant?.image_path ?? null}
        online={online}
      />
      <span className="truncate">{participant?.name ?? 'Team'}</span>
    </div>
  )
}
