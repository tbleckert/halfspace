import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CachedStanding, readSeasonSchedule } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { groupStandings } from './competition-workspace-data'
import { StandingsTable } from './standings-table'

export function CompetitionTable({
  competitionId,
  seasonId,
  date,
  online,
  schedule,
  standings,
  loaded,
  available,
  loading,
  roundId,
  onRoundChange,
  live = false,
  liveAvailable = false,
  liveFetchedAt,
  activeTeamIds = [],
  onLiveChange
}: {
  competitionId: number
  seasonId: number | null
  date: string
  online: boolean
  schedule: Awaited<ReturnType<typeof readSeasonSchedule>> | undefined
  standings: CachedStanding[]
  loaded: boolean
  available: boolean
  loading: boolean
  roundId?: number
  onRoundChange: (roundId?: number) => void
  live?: boolean
  liveAvailable?: boolean
  liveFetchedAt?: number
  activeTeamIds?: number[]
  onLiveChange?: () => void
}): React.JSX.Element {
  const stages = [...(schedule?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const rounds = stages.flatMap((stage) =>
    stage.rounds
      .filter((round) => round.finished || round.is_current)
      .toSorted((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((round) => ({
        id: round.id,
        label: `${stages.length > 1 ? `${stage.name} · ` : ''}Round ${round.name}`,
        date: round.ending_at ?? round.starting_at
      }))
  )
  const roundIndex = rounds.findIndex(({ id }) => id === roundId)
  const selectedRound = rounds[roundIndex]
  const groups = groupStandings(standings)
  const tableName = live
    ? 'Live table'
    : roundId
      ? (selectedRound?.label ?? 'Selected round')
      : 'Current table'

  return (
    <section aria-label="Season table" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {live &&
            (liveFetchedAt ? (
              <>
                {online ? 'Updated' : 'Saved'}{' '}
                <time
                  className="font-mono tabular-nums"
                  dateTime={new Date(liveFetchedAt).toISOString()}
                >
                  {new Date(liveFetchedAt).toLocaleString()}
                </time>
              </>
            ) : (
              'Standings with in-play scores'
            ))}
        </p>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Previous table round"
            variant="ghost"
            size="icon"
            disabled={roundId ? roundIndex <= 0 : rounds.length === 0}
            onClick={() => onRoundChange(rounds[roundId ? roundIndex - 1 : rounds.length - 1].id)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <NativeSelect
            aria-label="Table round"
            value={live ? 'live' : (roundId ?? 'current')}
            onChange={(event) =>
              event.target.value === 'live'
                ? onLiveChange?.()
                : onRoundChange(
                    event.target.value === 'current' ? undefined : Number(event.target.value)
                  )
            }
          >
            <NativeSelectOption value="current">Current table</NativeSelectOption>
            {liveAvailable && <NativeSelectOption value="live">Live table</NativeSelectOption>}
            {roundId && !selectedRound && (
              <NativeSelectOption value={roundId}>Selected round</NativeSelectOption>
            )}
            {rounds.map((round) => (
              <NativeSelectOption key={round.id} value={round.id}>
                {round.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            aria-label="Next table round"
            variant="ghost"
            size="icon"
            disabled={roundIndex < 0 || roundIndex >= rounds.length - 1}
            onClick={() => onRoundChange(rounds[roundIndex + 1].id)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {groups.length ? (
        groups.map((group) => (
          <StandingsTable
            key={group.key}
            competitionId={competitionId}
            date={selectedRound?.date ?? date}
            name={groups.length > 1 ? group.name : tableName}
            online={online}
            season={seasonId ?? undefined}
            standings={group.standings}
            activeTeamIds={live && online ? activeTeamIds : []}
          />
        ))
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {!loaded || loading
              ? 'Loading table…'
              : !available
                ? online
                  ? 'Table unavailable'
                  : 'Table not available offline'
                : live
                  ? 'No live table reported for this season'
                  : 'No table available'}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
