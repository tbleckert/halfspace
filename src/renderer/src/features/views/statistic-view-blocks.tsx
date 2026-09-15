import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type {
  PlayerViewSelection,
  TeamViewSelection,
  StatisticViewBlock,
  ViewBlock
} from '@shared/views'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useOnline } from '@/lib/use-online'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { db } from '@/data/db'
import { usePlayerEntity, usePlayerStatistics } from '@/features/players/use-player'
import { useTeamEntity, useTeamStatistics } from '@/features/teams/use-team'
import { PlayerPhoto } from '@/features/players/player-photo'
import {
  playerStatisticsSummary,
  teamStatisticsSummary
} from '@/features/statistics/statistics-data'
import {
  comparisonRows,
  playerRadarRows,
  teamComparisonMetrics,
  type ComparisonRow
} from '@/features/comparisons/comparison-data'
import { useStatisticSeasons } from '@/features/comparisons/use-statistic-seasons'
import { BlockError } from './view-block-state'

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const value = (numberValue: number | null): string =>
  numberValue === null ? '—' : number.format(numberValue)
type Selection = PlayerViewSelection | TeamViewSelection

function SelectionCaption({ selection }: { selection: Selection }): React.JSX.Element {
  const online = useOnline()
  const entity = 'playerId' in selection ? 'players' : 'teams'
  const entityId = 'playerId' in selection ? selection.playerId : selection.teamId
  const input = useMemo(() => ({ entity, entityId }) as const, [entity, entityId])
  const seasons = useStatisticSeasons(input, online)
  const record = seasons.cached?.records.find(
    (record) =>
      record.season.id === selection.seasonId &&
      record.season.league_id === selection.competitionId &&
      record.teamId === selection.teamId
  )
  const details = useScopedLiveQuery(async () => {
    const [team, competition] = await Promise.all([
      db.teams.get(selection.teamId),
      db.competitions.get(selection.competitionId)
    ])
    return {
      teamName: team?.name,
      competitionName: competition?.name,
      seasonName:
        competition?.currentSeasonId === selection.seasonId
          ? competition.currentSeasonName
          : undefined
    }
  }, [selection.teamId, selection.competitionId, selection.seasonId])
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground wrap-anywhere">
        {record?.teamName ?? details?.teamName ?? `Team ${selection.teamId}`} ·{' '}
        {record?.competitionName ??
          details?.competitionName ??
          `Competition ${selection.competitionId}`}{' '}
        · {record?.season.name ?? details?.seasonName ?? `Season ${selection.seasonId}`}
      </p>
      <BlockError error={seasons.error} online={online} refresh={seasons.refresh} />
    </div>
  )
}

export function StatisticViewBlockContent({
  block,
  onChange
}: {
  block: StatisticViewBlock
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const online = useOnline()
  if (block.type === 'player-profile') return <PlayerProfile block={block} online={online} />
  if (block.type === 'player-comparison') return <PlayerComparison block={block} online={online} />
  return <TeamComparison block={block} online={online} onChange={onChange} />
}
function PlayerProfile({
  block,
  online
}: {
  block: Extract<StatisticViewBlock, { type: 'player-profile' }>
  online: boolean
}): React.JSX.Element {
  const selection = block.selection
  const player = usePlayerEntity(selection.playerId, online)
  const input = useMemo(
    () => ({ playerId: selection.playerId, seasonId: selection.seasonId }),
    [selection.playerId, selection.seasonId]
  )
  const query = usePlayerStatistics(input, online)
  const record = query.cached?.statistics.find(
    (row) =>
      row.player_id === selection.playerId &&
      row.season_id === selection.seasonId &&
      row.team_id === selection.teamId
  )
  const summary = playerStatisticsSummary(record?.details ?? [])
  const identity = player.cached?.player
  const facts = [
    ['Minutes', summary.minutes],
    ['Appearances', summary.appearances],
    ['Goals', summary.goals],
    ['Assists', summary.assists],
    ['Shots', summary.shots],
    ['Key passes', summary.keyPasses]
  ] as const
  return (
    <div className="space-y-2">
      <SelectionCaption selection={selection} />
      <BlockError
        error={player.error ?? query.error}
        online={online}
        refresh={async () => {
          await Promise.all([player.refresh(), query.refresh()])
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Player profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 @min-[860px]/view-widget:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @min-[860px]/view-widget:items-center">
          <Link
            to="/players/$playerId/stats"
            params={{ playerId: String(selection.playerId) }}
            search={{
              team: selection.teamId,
              competition: selection.competitionId,
              season: selection.seasonId
            }}
            className="flex min-w-0 items-center gap-3 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlayerPhoto
              className="@min-[520px]/view-widget:size-20 size-14 bg-background"
              imagePath={identity?.imagePath ?? null}
              online={online}
            />
            <div className="min-w-0">
              <h3 className="@min-[520px]/view-widget:text-[28px] text-xl font-semibold wrap-anywhere">
                {identity?.displayName ?? `Player ${selection.playerId}`}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {[
                  identity?.raw.detailedPosition?.name ?? identity?.raw.position?.name,
                  identity?.raw.nationality?.name
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </Link>
          {!query.cached ? (
            <p role="status" className="text-sm text-muted-foreground">
              {query.error
                ? 'Statistics unavailable.'
                : online
                  ? 'Loading season statistics…'
                  : 'Statistics not cached for offline use.'}
            </p>
          ) : !record ? (
            <p className="text-sm text-muted-foreground">
              No statistics reported for this club and season.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-6 @min-[520px]/view-widget:grid-cols-3">
              {facts.map(([label, total]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-mono text-2xl tabular-nums">{value(total)}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
function PlayerComparison({
  block,
  online
}: {
  block: Extract<StatisticViewBlock, { type: 'player-comparison' }>
  online: boolean
}): React.JSX.Element {
  const firstInput = useMemo(
    () => ({ playerId: block.left.playerId, seasonId: block.left.seasonId }),
    [block.left.playerId, block.left.seasonId]
  )
  const secondInput = useMemo(
    () => ({ playerId: block.right.playerId, seasonId: block.right.seasonId }),
    [block.right.playerId, block.right.seasonId]
  )
  const first = usePlayerStatistics(firstInput, online)
  const second = usePlayerStatistics(secondInput, online)
  const firstRecord = first.cached?.statistics.find(
    (row) =>
      row.player_id === block.left.playerId &&
      row.season_id === block.left.seasonId &&
      row.team_id === block.left.teamId
  )
  const secondRecord = second.cached?.statistics.find(
    (row) =>
      row.player_id === block.right.playerId &&
      row.season_id === block.right.seasonId &&
      row.team_id === block.right.teamId
  )
  const left = playerStatisticsSummary(firstRecord?.details ?? [])
  const right = playerStatisticsSummary(secondRecord?.details ?? [])
  const rows = playerRadarRows(left, right)
  const error = first.error ?? second.error
  return (
    <div className="space-y-2">
      <BlockError
        error={error}
        online={online}
        refresh={async () => {
          await Promise.all([first.refresh(), second.refresh()])
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Player comparison</CardTitle>
          <p className="text-xs text-muted-foreground">
            Shared metrics per 90 minutes · Club and season samples
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <ComparisonSelections
            left={block.left}
            right={block.right}
            minutes={[left.minutes, right.minutes]}
          />
          {!first.cached || !second.cached ? (
            <p role="status" className="text-sm text-muted-foreground">
              {error
                ? 'Statistics unavailable.'
                : online
                  ? 'Loading season statistics…'
                  : 'Statistics not cached for offline use.'}
            </p>
          ) : rows.length ? (
            <ComparisonMetrics rows={rows} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No shared per-90 metrics for these selections. Both players need reported minutes
              above zero and matching statistics.
            </p>
          )}
          <Link
            className="inline-block text-xs text-primary hover:underline"
            to="/compare"
            search={{
              kind: 'players',
              left: block.left.playerId,
              right: block.right.playerId,
              leftSeason: block.left.seasonId,
              rightSeason: block.right.seasonId,
              leftTeam: block.left.teamId,
              rightTeam: block.right.teamId
            }}
          >
            Open full comparison
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
function TeamComparison({
  block,
  online,
  onChange
}: {
  block: Extract<StatisticViewBlock, { type: 'team-comparison' }>
  online: boolean
  onChange: (block: ViewBlock) => void
}): React.JSX.Element {
  const firstInput = useMemo(
    () => ({ teamId: block.left.teamId, seasonId: block.left.seasonId }),
    [block.left.teamId, block.left.seasonId]
  )
  const secondInput = useMemo(
    () => ({ teamId: block.right.teamId, seasonId: block.right.seasonId }),
    [block.right.teamId, block.right.seasonId]
  )
  const first = useTeamStatistics(firstInput, online)
  const second = useTeamStatistics(secondInput, online)
  const rows = comparisonRows(
    teamStatisticsSummary(first.cached?.statistics ?? [], block.left.matchLocation),
    teamStatisticsSummary(second.cached?.statistics ?? [], block.right.matchLocation),
    teamComparisonMetrics
  )
  const error = first.error ?? second.error
  const locationOptions = [
    { value: 'all', label: 'All matches' },
    { value: 'home', label: 'Home matches' },
    { value: 'away', label: 'Away matches' }
  ]
  return (
    <div className="space-y-2">
      <BlockError
        error={error}
        online={online}
        refresh={async () => {
          await Promise.all([first.refresh(), second.refresh()])
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Team comparison</CardTitle>
          <p className="text-xs text-muted-foreground">
            Reported season statistics · Independent samples
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <ComparisonSelections left={block.left} right={block.right} />
          <div className="grid grid-cols-2 gap-4">
            {(['left', 'right'] as const).map((side) => (
              <Select
                items={locationOptions}
                key={side}
                value={String(block[side].matchLocation)}
                onValueChange={(value) => {
                  if (value === null) return
                  onChange({
                    ...block,
                    [side]: {
                      ...block[side],
                      matchLocation: value as TeamViewSelection['matchLocation']
                    }
                  })
                }}
              >
                <SelectTrigger
                  className="w-full min-w-0"
                  aria-label={`${side === 'left' ? 'First' : 'Second'} team match location`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ))}
          </div>
          {!first.cached || !second.cached ? (
            <p role="status" className="text-sm text-muted-foreground">
              {error
                ? 'Statistics unavailable.'
                : online
                  ? 'Loading season statistics…'
                  : 'Statistics not cached for offline use.'}
            </p>
          ) : rows.length ? (
            <ComparisonMetrics rows={rows} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No statistics reported for these selections.
            </p>
          )}
          <Link
            className="inline-block text-xs text-primary hover:underline"
            to="/compare"
            search={{
              kind: 'teams',
              left: block.left.teamId,
              right: block.right.teamId,
              leftSeason: block.left.seasonId,
              rightSeason: block.right.seasonId,
              leftScope: block.left.matchLocation,
              rightScope: block.right.matchLocation
            }}
          >
            Open full comparison
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
function ComparisonSelections({
  left,
  right,
  minutes
}: {
  left: Selection
  right: Selection
  minutes?: [number | null, number | null]
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[left, right].map((selection, index) => (
        <ComparisonSelection
          key={index}
          selection={selection}
          index={index}
          minutes={minutes?.[index]}
        />
      ))}
    </div>
  )
}
function ComparisonSelection({
  selection,
  index,
  minutes
}: {
  selection: Selection
  index: number
  minutes?: number | null
}): React.JSX.Element {
  const online = useOnline()
  const playerId = 'playerId' in selection ? selection.playerId : null
  const player = usePlayerEntity(playerId, online)
  const team = useTeamEntity(playerId === null ? selection.teamId : null, online)
  const name =
    playerId === null
      ? (team.cached?.team?.name ?? `Team ${selection.teamId}`)
      : (player.cached?.player?.displayName ?? `Player ${playerId}`)
  return (
    <div className="min-w-0">
      <h4
        className={`text-base font-semibold wrap-anywhere ${index ? 'text-primary' : 'text-accent-foreground'}`}
      >
        {name}
      </h4>
      <SelectionCaption selection={selection} />
      <BlockError
        error={player.error ?? team.error}
        online={online}
        refresh={playerId === null ? team.refresh : player.refresh}
      />
      {minutes !== undefined && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{value(minutes)}</span> minutes
        </p>
      )}
    </div>
  )
}
function ComparisonMetrics({ rows }: { rows: ComparisonRow[] }): React.JSX.Element {
  return (
    <dl className="grid gap-6 @min-[520px]/view-widget:grid-cols-2 @min-[860px]/view-widget:grid-cols-3">
      {rows.map((row) => {
        const maximum = Math.max(row.left ?? 0, row.right ?? 0)
        return (
          <div key={row.label} className="min-w-0 space-y-2">
            <dt className="text-xs text-muted-foreground">
              {row.label}
              {row.unit ? ` (${row.unit})` : ''}
            </dt>
            <dd
              className="space-y-1.5"
              aria-label={`${value(row.left)} versus ${value(row.right)}`}
            >
              {([row.left, row.right] as const).map((total, index) => (
                <div key={index} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
                  <span className="font-mono text-sm tabular-nums">{value(total)}</span>
                  <span
                    className="h-1.5 overflow-hidden rounded-full bg-background"
                    aria-hidden="true"
                  >
                    <span
                      className={`block h-full rounded-full ${index ? 'bg-chart-2' : 'bg-chart-1'}`}
                      style={{
                        width: `${total === null || maximum === 0 ? 0 : (total / maximum) * 100}%`
                      }}
                    />
                  </span>
                </div>
              ))}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
