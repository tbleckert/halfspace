import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { readSeasonSchedule } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'
import { selectedSchedulePart, sortScheduleRounds } from './season-schedule-data'

export function SeasonSchedule({
  cached,
  loading,
  online,
  competitionId,
  seasonId,
  stageId,
  roundId,
  onSelect
}: {
  cached: Awaited<ReturnType<typeof readSeasonSchedule>> | undefined
  loading: boolean
  online: boolean
  competitionId: number
  seasonId: number | null
  stageId?: number
  roundId?: number
  onSelect: (stageId: number, roundId?: number) => void
}): React.JSX.Element {
  const stages = [...(cached?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const stage = selectedSchedulePart(stages, stageId)
  const rounds = sortScheduleRounds(stage?.rounds ?? [])
  const round = selectedSchedulePart(rounds, roundId)
  const roundIndex = rounds.findIndex((item) => item.id === round?.id)
  const ids = new Set(round?.fixtureIds ?? stage?.fixtureIds ?? [])
  const fixtures = (cached?.fixtures ?? [])
    .filter((fixture) => ids.has(fixture.id))
    .sort((a, b) => (a.startingAt ?? Infinity) - (b.startingAt ?? Infinity))

  if (!stage)
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {cached === undefined || loading
            ? 'Loading schedule…'
            : !cached && !online
              ? 'Schedule not available offline'
              : 'No schedule available'}
        </CardContent>
      </Card>
    )

  return (
    <section className="flex flex-col gap-4" aria-label="Season schedule">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NativeSelect
          aria-label="Stage"
          value={stage.id}
          onChange={(event) => onSelect(Number(event.target.value))}
        >
          {stages.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {round && (
          <div className="flex items-center gap-1">
            <Button
              aria-label="Previous round"
              variant="ghost"
              size="icon"
              disabled={roundIndex <= 0}
              onClick={() => onSelect(stage.id, rounds[roundIndex - 1].id)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <NativeSelect
              aria-label="Round"
              value={round.id}
              onChange={(event) => onSelect(stage.id, Number(event.target.value))}
            >
              {rounds.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  Round {item.name}
                  {item.is_current ? ' · Current' : ''}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              aria-label="Next round"
              variant="ghost"
              size="icon"
              disabled={roundIndex === rounds.length - 1}
              onClick={() => onSelect(stage.id, rounds[roundIndex + 1].id)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <EntityFixturePanel
        context={{ competition: competitionId, season: seasonId ?? undefined }}
        fixtures={fixtures}
        label={round ? `${stage.name} · Round ${round.name}` : stage.name}
        loading={loading}
        online={online}
      />
    </section>
  )
}
