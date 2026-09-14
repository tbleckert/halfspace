import type { RefreshTeamFixturesInput } from '@shared/contracts'
import type { CachedFixture } from '@/data/db'
import { addDaysToIsoDate } from '@/lib/date'

export function teamViewFixtureInput(
  teamId: number,
  today: string,
  timeZone: string
): RefreshTeamFixturesInput {
  return {
    teamId,
    startDate: addDaysToIsoDate(today, -30),
    endDate: addDaysToIsoDate(today, 30),
    timeZone
  }
}

export function selectTeamViewFixtures(
  fixtures: CachedFixture[],
  teamId: number,
  period: 'upcoming' | 'recent',
  now: number
): CachedFixture[] {
  return fixtures
    .filter(
      (fixture) =>
        !fixture.raw.placeholder &&
        fixture.startingAt !== null &&
        fixture.raw.participants?.some((participant) => participant.id === teamId) &&
        (period === 'upcoming'
          ? fixture.stateId === 1 && fixture.startingAt >= now
          : [5, 7, 8].includes(fixture.stateId) && fixture.startingAt <= now)
    )
    .toSorted((a, b) =>
      period === 'recent' ? b.startingAt! - a.startingAt! : a.startingAt! - b.startingAt!
    )
}
