import type { SportmonksPlayerStatistic } from '@shared/contracts'
import type {
  PlayerStatisticsSummary,
  TeamStatisticsSummary
} from '@/features/statistics/statistics-data'

export type ComparisonKind = 'teams' | 'players'
interface Metric<T> {
  key: keyof T
  label: string
  unit?: '%'
}
export interface ComparisonRow {
  label: string
  left: number | null
  right: number | null
  unit?: '%'
}

export interface PlayerRadarRow {
  label: string
  left: number
  right: number
  leftRatio: number
  rightRatio: number
}

const playerRadarMetrics: Metric<PlayerStatisticsSummary>[] = [
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'shots', label: 'Shots' },
  { key: 'keyPasses', label: 'Key passes' },
  { key: 'passes', label: 'Passes' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
  { key: 'clearances', label: 'Clearances' },
  { key: 'saves', label: 'Saves' }
]

export function playerRadarRows(
  left: PlayerStatisticsSummary,
  right: PlayerStatisticsSummary
): PlayerRadarRow[] {
  const leftMinutes = left.minutes
  const rightMinutes = right.minutes
  if (leftMinutes === null || rightMinutes === null || leftMinutes <= 0 || rightMinutes <= 0) {
    return []
  }
  return playerRadarMetrics.flatMap(({ key, label }) => {
    const leftTotal = left[key]
    const rightTotal = right[key]
    if (leftTotal === null || rightTotal === null) return []
    const first = (leftTotal / leftMinutes) * 90
    const second = (rightTotal / rightMinutes) * 90
    const maximum = Math.max(first, second)
    return [
      {
        label,
        left: first,
        right: second,
        leftRatio: maximum ? first / maximum : 0,
        rightRatio: maximum ? second / maximum : 0
      }
    ]
  })
}

export function comparisonRows<T extends { [K in keyof T]: number | null }>(
  left: T,
  right: T,
  metrics: readonly Metric<T>[]
): ComparisonRow[] {
  return metrics.flatMap(({ key, label, unit }) =>
    left[key] === null && right[key] === null
      ? []
      : [{ label, left: left[key], right: right[key], unit }]
  )
}

export function playerComparisonRecord(
  records: SportmonksPlayerStatistic[],
  teamId?: number
): SportmonksPlayerStatistic | null {
  return (teamId ? records.find((record) => record.team_id === teamId) : records[0]) ?? null
}

export const teamComparisonMetrics: Metric<TeamStatisticsSummary>[] = [
  { key: 'matches', label: 'Matches' },
  { key: 'wins', label: 'Wins' },
  { key: 'draws', label: 'Draws' },
  { key: 'losses', label: 'Losses' },
  { key: 'goalsFor', label: 'Goals' },
  { key: 'goalsAgainst', label: 'Goals against' },
  { key: 'cleanSheets', label: 'Clean sheets' },
  { key: 'goalsForPerMatch', label: 'Goals per match' },
  { key: 'goalsAgainstPerMatch', label: 'Goals against per match' },
  { key: 'shotsPerMatch', label: 'Shots per match' },
  { key: 'cornersPerMatch', label: 'Corners per match' },
  { key: 'averagePossession', label: 'Possession', unit: '%' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' }
]

export const playerComparisonMetrics: Metric<PlayerStatisticsSummary>[] = [
  { key: 'appearances', label: 'Appearances' },
  { key: 'starts', label: 'Starts' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'rating', label: 'Rating' },
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'shots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on target' },
  { key: 'passes', label: 'Passes' },
  { key: 'passAccuracy', label: 'Pass accuracy', unit: '%' },
  { key: 'keyPasses', label: 'Key passes' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
  { key: 'clearances', label: 'Clearances' },
  { key: 'saves', label: 'Saves' },
  { key: 'cleanSheets', label: 'Clean sheets' },
  { key: 'goalsConceded', label: 'Goals conceded' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' }
]
