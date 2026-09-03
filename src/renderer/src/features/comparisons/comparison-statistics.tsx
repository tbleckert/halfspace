import { useMemo } from 'react'
import type { SportmonksPlayerStatistic } from '@shared/contracts'
import { RefreshCw } from 'lucide-react'
import { db } from '@/data/db'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useTeamEntity, useTeamStatistics } from '@/features/teams/use-team'
import { usePlayerStatistics } from '@/features/players/use-player'
import {
  playerStatisticsSummary,
  teamStatisticsSummary
} from '@/features/statistics/statistics-data'
import {
  comparisonRows,
  playerComparisonMetrics,
  playerComparisonRecord,
  teamComparisonMetrics,
  type ComparisonRow
} from './comparison-data'

interface ComparisonStatisticsProps {
  left: number
  right: number
  seasonId: number
  online: boolean
}

export function TeamComparisonStatistics({
  left,
  right,
  seasonId,
  online
}: ComparisonStatisticsProps): React.JSX.Element {
  const leftInput = useMemo(() => ({ teamId: left, seasonId }), [left, seasonId])
  const rightInput = useMemo(() => ({ teamId: right, seasonId }), [right, seasonId])
  const first = useTeamStatistics(leftInput, online)
  const second = useTeamStatistics(rightInput, online)
  const rows = comparisonRows(
    teamStatisticsSummary(first.cached?.statistics ?? []),
    teamStatisticsSummary(second.cached?.statistics ?? []),
    teamComparisonMetrics
  )
  return (
    <ComparisonStatisticsTable
      rows={rows}
      online={online}
      firstLoaded={!!first.cached}
      secondLoaded={!!second.cached}
      refreshing={first.refreshing || second.refreshing}
      error={first.error ?? second.error}
      refresh={() => Promise.all([first.refresh(), second.refresh()])}
    />
  )
}

export function PlayerComparisonStatistics({
  left,
  right,
  seasonId,
  online,
  leftTeam,
  rightTeam,
  onClubChange
}: ComparisonStatisticsProps & {
  leftTeam?: number
  rightTeam?: number
  onClubChange: (side: 'left' | 'right', teamId: number) => void
}): React.JSX.Element {
  const leftInput = useMemo(() => ({ playerId: left, seasonId }), [left, seasonId])
  const rightInput = useMemo(() => ({ playerId: right, seasonId }), [right, seasonId])
  const first = usePlayerStatistics(leftInput, online)
  const second = usePlayerStatistics(rightInput, online)
  const leftRecord = playerComparisonRecord(first.cached?.statistics ?? [], leftTeam)
  const rightRecord = playerComparisonRecord(second.cached?.statistics ?? [], rightTeam)
  const rows = comparisonRows(
    playerStatisticsSummary(leftRecord?.details ?? []),
    playerStatisticsSummary(rightRecord?.details ?? []),
    playerComparisonMetrics
  )
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <PlayerComparisonClub
          label="First player's club"
          records={first.cached?.statistics ?? []}
          teamId={leftRecord?.team_id}
          online={online}
          onChange={(id) => onClubChange('left', id)}
        />
        <PlayerComparisonClub
          label="Second player's club"
          records={second.cached?.statistics ?? []}
          teamId={rightRecord?.team_id}
          online={online}
          onChange={(id) => onClubChange('right', id)}
        />
      </div>
      <ComparisonStatisticsTable
        rows={rows}
        online={online}
        firstLoaded={!!first.cached}
        secondLoaded={!!second.cached}
        refreshing={first.refreshing || second.refreshing}
        error={first.error ?? second.error}
        refresh={() => Promise.all([first.refresh(), second.refresh()])}
      />
    </>
  )
}

function PlayerComparisonClub({
  label,
  records,
  teamId,
  online,
  onChange
}: {
  label: string
  records: SportmonksPlayerStatistic[]
  teamId?: number
  online: boolean
  onChange: (id: number) => void
}): React.JSX.Element {
  const teamIds = [...new Set(records.map((record) => record.team_id))]
  const clubs = useScopedLiveQuery(() => db.teams.bulkGet(teamIds), [teamIds.join(',')])
  const selected = useTeamEntity(teamId ?? null, online)
  if (!teamIds.length)
    return <p className="text-sm text-muted-foreground">No club record this season</p>
  if (teamIds.length === 1)
    return (
      <p className="text-sm text-muted-foreground">
        {selected.cached?.team?.name ?? clubs?.[0]?.name ?? `Team ${teamIds[0]}`}
      </p>
    )
  return (
    <NativeSelect
      aria-label={label}
      value={teamId ?? ''}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {!teamId && <NativeSelectOption value="">Choose club</NativeSelectOption>}
      {teamIds.map((id, index) => (
        <NativeSelectOption key={id} value={id}>
          {clubs?.[index]?.name ?? `Team ${id}`}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

function ComparisonStatisticsTable({
  rows,
  online,
  firstLoaded,
  secondLoaded,
  refreshing,
  error,
  refresh
}: {
  rows: ComparisonRow[]
  online: boolean
  firstLoaded: boolean
  secondLoaded: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<unknown>
}): React.JSX.Element {
  return (
    <>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {(!firstLoaded || !secondLoaded) && (
        <p role="status" className="text-sm text-muted-foreground">
          {online
            ? refreshing
              ? 'Loading season statistics…'
              : 'Season statistics are not available'
            : 'Some statistics are not available offline'}
        </p>
      )}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <CardTitle className="text-base">Season comparison</CardTitle>
          <Button
            aria-label="Refresh comparison"
            size="icon"
            variant="ghost"
            disabled={!online || refreshing}
            onClick={() => void refresh()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
        <Table aria-label="Season comparison">
          <TableHeader className="sr-only">
            <TableRow>
              <TableHead>First selection</TableHead>
              <TableHead>Statistic</TableHead>
              <TableHead>Second selection</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="w-1/4 px-5 font-mono text-sm tabular-nums">
                  {formatComparisonValue(row.left, row.unit)}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {row.label}
                </TableCell>
                <TableCell className="w-1/4 px-5 text-right font-mono text-sm tabular-nums">
                  {formatComparisonValue(row.right, row.unit)}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                  {refreshing ? 'Loading statistics…' : 'No reported statistics for this selection'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}

function formatComparisonValue(value: number | null, unit?: '%'): string {
  return value === null
    ? '—'
    : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}${unit ?? ''}`
}
