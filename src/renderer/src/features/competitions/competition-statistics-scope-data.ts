import type { SeasonScheduleQuery } from '@/data/db'

type Stage = SeasonScheduleQuery['stages'][number]

export function resolveStatisticsScope(
  stages: Stage[],
  stageId?: number,
  roundId?: number
): { stage: Stage | undefined; round: Stage['rounds'][number] | undefined; valid: boolean } {
  const stage =
    stageId === undefined
      ? stages.find((item) => item.rounds.some((round) => round.id === roundId))
      : stages.find((item) => item.id === stageId)
  const round = stage?.rounds.find((item) => item.id === roundId)
  return {
    stage,
    round,
    valid:
      (stageId === undefined && roundId === undefined) ||
      Boolean(stage && (roundId === undefined || round))
  }
}
