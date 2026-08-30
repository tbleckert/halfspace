import { describe, expect, it } from 'vitest'
import type { SportmonksSeasonStatistic, SportmonksTeamStatistic } from '@shared/contracts'
import { leagueStatisticsSummary, teamStatisticsSummary } from './statistics-data'

describe('statistics summaries', () => {
  it('turns season statistics into a compact league summary', () => {
    const summary = leagueStatisticsSummary([
      seasonStatistic(188, { total: 240, played: 30, percentage: 12.5 }),
      seasonStatistic(189, { count: 16 }),
      seasonStatistic(190, { count: 6 }),
      seasonStatistic(191, {
        total: 92,
        home: { count: 54 },
        away: { count: 38 }
      }),
      seasonStatistic(192, { count: 17, percentage: 56.67 }),
      seasonStatistic(193, { total: 101 }),
      seasonStatistic(194, { total: 12 })
    ])

    expect(summary).toEqual({
      awayGoals: 38,
      bothTeamsScored: 17,
      bothTeamsScoredPercentage: 56.67,
      cards: 101,
      cleanSheets: 12,
      draws: 6,
      goals: 92,
      goalsPerMatch: 3.07,
      homeGoals: 54,
      matches: 30,
      teams: 16
    })
  })

  it('turns nested team statistic values into season performance', () => {
    const summary = teamStatisticsSummary([
      teamStatistic(27263, { all: { count: 20 } }),
      teamStatistic(214, { count: 12 }),
      teamStatistic(215, { count: 4 }),
      teamStatistic(216, { count: 4 }),
      teamStatistic(52, { all: { count: 38, average: 1.9 } }),
      teamStatistic(88, { all: { count: 15, average: 0.75 } }),
      teamStatistic(194, { count: 9 }),
      teamStatistic(45, { average: 57.4 }),
      teamStatistic(1677, { count: 240, average: 12 }),
      teamStatistic(34, { count: 110, average: 5.5 }),
      teamStatistic(84, { count: 31 }),
      teamStatistic(83, { count: 1 })
    ])

    expect(summary).toEqual({
      averagePossession: 57.4,
      cleanSheets: 9,
      cornersPerMatch: 5.5,
      draws: 4,
      goalsAgainst: 15,
      goalsAgainstPerMatch: 0.75,
      goalsFor: 38,
      goalsForPerMatch: 1.9,
      losses: 4,
      matches: 20,
      redCards: 1,
      shotsPerMatch: 12,
      wins: 12,
      yellowCards: 31
    })
  })
})

function seasonStatistic(typeId: number, value: unknown): SportmonksSeasonStatistic {
  return { id: typeId, model_id: 23614, relation_id: null, type_id: typeId, value }
}

function teamStatistic(typeId: number, value: unknown): SportmonksTeamStatistic {
  return { id: typeId, team_statistic_id: 501, type_id: typeId, value }
}
