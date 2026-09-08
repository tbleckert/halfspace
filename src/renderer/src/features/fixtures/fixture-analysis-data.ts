import type { SportmonksFixtureStatistic, SportmonksPrediction } from '@shared/contracts'
import { fixtureStatisticRows, type StatisticRow } from './fixture-detail-data'

const expectedMetrics = [
  { id: 5304, label: 'Expected goals (xG)' },
  { id: 5305, label: 'Expected goals on target (xGoT)' },
  { id: 7943, label: 'Non-penalty xG' },
  { id: 7939, label: 'Expected points (xPTS)' }
]

export function expectedMetricRows(statistics: SportmonksFixtureStatistic[]): StatisticRow[] {
  const rows = fixtureStatisticRows(statistics)
  return expectedMetrics.flatMap((metric) => {
    const row = rows.find((row) => row.id === metric.id)
    if (!row) return []
    return [
      { ...row, label: metric.label, home: formatMetric(row.home), away: formatMetric(row.away) }
    ]
  })
}

function formatMetric(value: number | string | null): string | null {
  if (value === null || (typeof value === 'string' && value.trim() === '')) return null
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : null
}

export interface PredictionOutcome {
  label: string
  probability: number
}
export interface PredictionGroup {
  id: number
  label: string
  outcomes: PredictionOutcome[]
}

export function predictionGroups(
  predictions: SportmonksPrediction[],
  home: string,
  away: string
): PredictionGroup[] {
  const categories = [
    {
      id: 237,
      label: 'Match result',
      outcomes: [
        ['home', home],
        ['draw', 'Draw'],
        ['away', away]
      ]
    },
    {
      id: 231,
      label: 'Both teams to score',
      outcomes: [
        ['yes', 'Yes'],
        ['no', 'No']
      ]
    },
    {
      id: 235,
      label: 'Total goals',
      outcomes: [
        ['yes', 'Over 2.5'],
        ['no', 'Under 2.5']
      ]
    }
  ]
  const groups = categories.flatMap((category) => {
    const record = predictions.find((prediction) => prediction.type_id === category.id)
    const outcomes = category.outcomes.flatMap(([key, label]) => {
      const value = record?.predictions[key]
      return typeof value === 'number' ? [{ label, probability: value }] : []
    })
    return outcomes.length ? [{ id: category.id, label: category.label, outcomes }] : []
  })
  const scores = predictions.find((prediction) => prediction.type_id === 240)?.predictions.scores
  if (scores && typeof scores === 'object') {
    const outcomes = Object.entries(scores)
      .map(([key, probability]) => ({
        label:
          (
            {
              Other_1: 'Other home win',
              Other_2: 'Other away win',
              Other_X: 'Other draw'
            } as Record<string, string>
          )[key] ?? key,
        probability
      }))
      .sort((a, b) => b.probability - a.probability || a.label.localeCompare(b.label))
    if (outcomes.length) groups.push({ id: 240, label: 'Correct score', outcomes })
  }
  return groups
}
