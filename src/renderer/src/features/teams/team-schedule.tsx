import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Card, CardContent } from '@/components/ui/card'
import type { readTeamSchedule } from '@/data/season-resources-cache'
import { EntityFixturePanel } from '@/features/fixtures/entity-fixture-panel'

export function TeamSchedule({
  cached,
  loading,
  online,
  teamId,
  seasonId,
  competitionId,
  stageId,
  onStageChange
}: {
  cached: Awaited<ReturnType<typeof readTeamSchedule>> | undefined
  loading: boolean
  online: boolean
  teamId: number
  seasonId: number | null
  competitionId: number | null
  stageId?: number
  onStageChange: (stageId?: number) => void
}): React.JSX.Element {
  const stages = [...(cached?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const selectedStage = stages.find((stage) => stage.id === stageId)
  const stageFixtureIds = new Set([
    ...(selectedStage?.fixtureIds ?? []),
    ...(selectedStage?.rounds.flatMap((round) => round.fixtureIds) ?? [])
  ])
  const fixtures = [...(cached?.fixtures ?? [])]
    .filter((fixture) => stageId === undefined || stageFixtureIds.has(fixture.id))
    .sort((a, b) => (a.startingAt ?? Infinity) - (b.startingAt ?? Infinity))
  if (!cached)
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {!seasonId
            ? 'Choose a competition season to see its schedule'
            : loading || cached === undefined
              ? 'Loading schedule…'
              : online
                ? 'Schedule unavailable'
                : 'Schedule not available offline'}
        </CardContent>
      </Card>
    )
  return (
    <div className="space-y-4">
      {(stages.length > 1 || stageId !== undefined) && (
        <NativeSelect
          aria-label="Schedule stage"
          value={stageId ?? ''}
          onChange={(event) =>
            onStageChange(event.target.value ? Number(event.target.value) : undefined)
          }
        >
          <NativeSelectOption value="">All stages</NativeSelectOption>
          {stageId !== undefined && !selectedStage && (
            <NativeSelectOption value={stageId}>Selected stage unavailable</NativeSelectOption>
          )}
          {stages.map((stage) => (
            <NativeSelectOption key={stage.id} value={stage.id}>
              {stage.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
      <EntityFixturePanel
        context={{
          team: teamId,
          season: seasonId ?? undefined,
          competition: competitionId ?? undefined
        }}
        label={stages.find((stage) => stage.id === stageId)?.name ?? 'Season fixtures'}
        fixtures={fixtures}
        loading={loading}
        online={online}
      />
    </div>
  )
}
