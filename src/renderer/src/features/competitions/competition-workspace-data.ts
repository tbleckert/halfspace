import type { CachedFixture, CachedStanding } from '@/data/db'

export interface StandingGroup {
  key: string
  name: string
  standings: CachedStanding[]
}

export function groupStandings(standings: readonly CachedStanding[]): StandingGroup[] {
  const overall = standings.filter(({ raw }) => raw.result === 'overall')
  const rows = overall.length > 0 ? overall : standings
  const groups = new Map<string, StandingGroup>()

  for (const standing of rows) {
    const groupId = standing.groupId
    const key = groupId === null ? `stage:${standing.stageId}` : `group:${groupId}`
    const name = standing.raw.group?.name ?? standing.raw.stage?.name ?? 'Table'
    const group = groups.get(key) ?? { key, name, standings: [] }
    group.standings.push(standing)
    groups.set(key, group)
  }

  return [...groups.values()].map((group) => ({
    ...group,
    standings: group.standings.toSorted((left, right) => left.position - right.position)
  }))
}

export function nearestFixtureSeasonId(
  fixtures: readonly CachedFixture[],
  now: number
): number | null {
  const nearest = fixtures
    .filter(
      (fixture): fixture is CachedFixture & { startingAt: number } => fixture.startingAt !== null
    )
    .toSorted(
      (left, right) => Math.abs(left.startingAt - now) - Math.abs(right.startingAt - now)
    )[0]

  return nearest?.seasonId ?? null
}
