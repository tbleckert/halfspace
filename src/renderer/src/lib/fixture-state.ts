import type { SportmonksFixture } from '@shared/contracts'

const liveStateIds = new Set([2, 6, 9, 22])
const ongoingStateIds = new Set([...liveStateIds, 3])

export function isFixtureLive(stateId: number): boolean {
  return liveStateIds.has(stateId)
}

export function isFixtureOngoing(stateId: number): boolean {
  return ongoingStateIds.has(stateId)
}

export function fixtureProgressLabel(fixture: SportmonksFixture): string | null {
  if (!isFixtureOngoing(fixture.state_id)) return null
  if (fixture.state_id === 3) return fixture.state?.short_name ?? 'HT'

  const period = fixture.periods?.find(({ ticking }) => ticking)
  if (!period || period.minutes === null)
    return fixture.state?.short_name ?? fixture.state?.name ?? 'Live'

  const regularPeriodEnd = period.counts_from + period.period_length
  if (period.minutes > regularPeriodEnd) {
    return `${regularPeriodEnd}+${period.minutes - regularPeriodEnd}′`
  }

  return `${period.minutes}′`
}

export type FixtureRowStatus =
  { kind: 'kickoff' } | { kind: 'in-play'; label: string } | { kind: 'state'; label: string }

export function fixtureRowStatus(fixture: SportmonksFixture): FixtureRowStatus {
  const progressLabel = fixtureProgressLabel(fixture)
  if (progressLabel) return { kind: 'in-play', label: progressLabel }

  if (fixture.state_id === 1) return { kind: 'kickoff' }

  const stateLabel = fixture.state?.short_name ?? fixture.state?.name
  return stateLabel ? { kind: 'state', label: stateLabel } : { kind: 'kickoff' }
}
