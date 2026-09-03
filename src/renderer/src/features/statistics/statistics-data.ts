interface Statistic {
  type_id: number
  value: unknown
}

export function refereeStatisticsSummary(statistics: Statistic[]): {
  matches: number | null
  rows: { label: string; total: number | null; average: number | null }[]
} {
  const types = [
    { id: 84, label: 'Yellow cards' },
    { id: 83, label: 'Straight red cards' },
    { id: 85, label: 'Second yellow cards' },
    { id: 47, label: 'Penalties' },
    { id: 56, label: 'Fouls' },
    { id: 314, label: 'VAR moments' }
  ]
  return {
    matches: statisticCount(statistics, 188),
    rows: types.map(({ id, label }) => ({
      label,
      total: statisticCount(statistics, id),
      average: statisticAverage(statistics, id)
    }))
  }
}

export interface LeagueStatisticsSummary {
  awayGoals: number | null
  bothTeamsScored: number | null
  bothTeamsScoredPercentage: number | null
  cards: number | null
  cleanSheets: number | null
  draws: number | null
  goals: number | null
  goalsPerMatch: number | null
  homeGoals: number | null
  matches: number | null
  teams: number | null
}

export interface TeamStatisticsSummary {
  averagePossession: number | null
  cleanSheets: number | null
  cornersPerMatch: number | null
  draws: number | null
  goalsAgainst: number | null
  goalsAgainstPerMatch: number | null
  goalsFor: number | null
  goalsForPerMatch: number | null
  losses: number | null
  matches: number | null
  redCards: number | null
  shotsPerMatch: number | null
  wins: number | null
  yellowCards: number | null
}

export interface PlayerStatisticsSummary {
  accuratePasses: number | null
  appearances: number | null
  assists: number | null
  cleanSheets: number | null
  clearances: number | null
  duelsWon: number | null
  expectedGoals: number | null
  fouls: number | null
  goals: number | null
  goalsConceded: number | null
  interceptions: number | null
  keyPasses: number | null
  minutes: number | null
  passAccuracy: number | null
  passes: number | null
  rating: number | null
  redCards: number | null
  saves: number | null
  shots: number | null
  shotsOnTarget: number | null
  starts: number | null
  tackles: number | null
  yellowCards: number | null
}

export function leagueStatisticsSummary(statistics: Statistic[]): LeagueStatisticsSummary {
  const matches = statisticNumber(statistics, 188, 'played') ?? statisticCount(statistics, 188)
  const goals = statisticTotal(statistics, 191)

  return {
    awayGoals: statisticNestedNumber(statistics, 191, 'away', 'count'),
    bothTeamsScored: statisticCount(statistics, 192),
    bothTeamsScoredPercentage: statisticNumber(statistics, 192, 'percentage'),
    cards: statisticTotal(statistics, 193),
    cleanSheets: statisticTotal(statistics, 194),
    draws: statisticCount(statistics, 190),
    goals,
    goalsPerMatch: goals !== null && matches ? Math.round((goals / matches) * 100) / 100 : null,
    homeGoals: statisticNestedNumber(statistics, 191, 'home', 'count'),
    matches,
    teams: statisticCount(statistics, 189)
  }
}

export function teamStatisticsSummary(statistics: Statistic[]): TeamStatisticsSummary {
  return {
    averagePossession: statisticAverage(statistics, 45),
    cleanSheets: statisticCount(statistics, 194),
    cornersPerMatch: statisticAverage(statistics, 34),
    draws: statisticCount(statistics, 215),
    goalsAgainst: statisticCount(statistics, 88),
    goalsAgainstPerMatch: statisticAverage(statistics, 88),
    goalsFor: statisticCount(statistics, 52) ?? statisticCount(statistics, 191),
    goalsForPerMatch: statisticAverage(statistics, 52) ?? statisticAverage(statistics, 191),
    losses: statisticCount(statistics, 216),
    matches: statisticCount(statistics, 27263) ?? statisticCount(statistics, 188),
    redCards: statisticCount(statistics, 83),
    shotsPerMatch: statisticAverage(statistics, 1677),
    wins: statisticCount(statistics, 214),
    yellowCards: statisticCount(statistics, 84)
  }
}

export function playerStatisticsSummary(statistics: Statistic[]): PlayerStatisticsSummary {
  return {
    accuratePasses: statisticCount(statistics, 116),
    appearances: statisticCount(statistics, 321),
    assists: statisticCount(statistics, 79),
    cleanSheets: statisticCount(statistics, 194),
    clearances: statisticCount(statistics, 101),
    duelsWon: statisticCount(statistics, 106),
    expectedGoals: statisticTotal(statistics, 5304),
    fouls: statisticCount(statistics, 56),
    goals: statisticCount(statistics, 52),
    goalsConceded: statisticCount(statistics, 88),
    interceptions: statisticCount(statistics, 100),
    keyPasses: statisticCount(statistics, 117),
    minutes: statisticCount(statistics, 119),
    passAccuracy:
      statisticNumber(statistics, 1584, 'percentage') ??
      statisticAverage(statistics, 1584) ??
      statisticTotal(statistics, 1584),
    passes: statisticCount(statistics, 80),
    rating: statisticAverage(statistics, 118) ?? statisticTotal(statistics, 118),
    redCards:
      addNullable(statisticCount(statistics, 83), statisticCount(statistics, 85)) ??
      statisticCount(statistics, 83),
    saves: statisticCount(statistics, 57),
    shots: statisticCount(statistics, 42),
    shotsOnTarget: statisticCount(statistics, 86),
    starts: statisticCount(statistics, 322),
    tackles: statisticCount(statistics, 78),
    yellowCards: statisticCount(statistics, 84)
  }
}

function addNullable(left: number | null, right: number | null): number | null {
  if (left === null && right === null) return null
  return (left ?? 0) + (right ?? 0)
}

function statisticCount(statistics: Statistic[], typeId: number): number | null {
  return (
    statisticNumber(statistics, typeId, 'count') ??
    statisticNestedNumber(statistics, typeId, 'all', 'count') ??
    statisticTotal(statistics, typeId)
  )
}

function statisticAverage(statistics: Statistic[], typeId: number): number | null {
  return (
    statisticNumber(statistics, typeId, 'average') ??
    statisticNestedNumber(statistics, typeId, 'all', 'average')
  )
}

function statisticTotal(statistics: Statistic[], typeId: number): number | null {
  const value = statisticValue(statistics, typeId)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return numberAt(value, 'total')
}

function statisticNumber(statistics: Statistic[], typeId: number, property: string): number | null {
  return numberAt(statisticValue(statistics, typeId), property)
}

function statisticNestedNumber(
  statistics: Statistic[],
  typeId: number,
  property: string,
  nestedProperty: string
): number | null {
  const value = statisticValue(statistics, typeId)
  if (!isRecord(value)) return null
  return numberAt(value[property], nestedProperty)
}

function statisticValue(statistics: Statistic[], typeId: number): unknown {
  return statistics.find((statistic) => statistic.type_id === typeId)?.value
}

function numberAt(value: unknown, property: string): number | null {
  if (!isRecord(value)) return null
  const candidate = value[property]
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
