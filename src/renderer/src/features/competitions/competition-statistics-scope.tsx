import { resolveStatisticsScope } from './competition-statistics-scope-data'
import type { SeasonScheduleQuery } from '@/data/db'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { sortScheduleRounds } from './season-schedule-data'

type Stage = SeasonScheduleQuery['stages'][number]

export function CompetitionStatisticsScope({
  stages,
  stageId,
  roundId,
  onSelect
}: {
  stages: Stage[]
  stageId?: number
  roundId?: number
  onSelect: (stageId?: number, roundId?: number) => void
}): React.JSX.Element {
  const { stage, round } = resolveStatisticsScope(stages, stageId, roundId)
  const missingStage = !stage && (stageId !== undefined || roundId !== undefined)
  const missingRound = roundId !== undefined && !round
  const rounds = sortScheduleRounds(stage?.rounds ?? [])
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Statistics stage"
        value={stage?.id ?? (missingStage ? 'unavailable' : '')}
        onChange={(event) => onSelect(event.target.value ? Number(event.target.value) : undefined)}
      >
        <NativeSelectOption value="">Full season</NativeSelectOption>
        {missingStage && (
          <NativeSelectOption value="unavailable" disabled>
            Selected stage unavailable
          </NativeSelectOption>
        )}
        {[...stages]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.name}
            </NativeSelectOption>
          ))}
      </NativeSelect>
      {stage && (rounds.length > 0 || missingRound) && (
        <NativeSelect
          aria-label="Statistics round"
          value={missingRound ? 'unavailable' : (roundId ?? '')}
          onChange={(event) =>
            onSelect(stage.id, event.target.value ? Number(event.target.value) : undefined)
          }
        >
          <NativeSelectOption value="">All rounds</NativeSelectOption>
          {missingRound && (
            <NativeSelectOption value="unavailable" disabled>
              Selected round unavailable
            </NativeSelectOption>
          )}
          {rounds.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              Round {item.name}
              {item.is_current ? ' · Current' : ''}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </div>
  )
}
