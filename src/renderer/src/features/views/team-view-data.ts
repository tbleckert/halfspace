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

export function seasonTeamResults(
  fixtures: CachedFixture[],
  block: { teamId: number; competitionId: number; seasonId: number }
): CachedFixture[] {
  return fixtures
    .filter(
      (fixture) =>
        fixture.leagueId === block.competitionId &&
        fixture.seasonId === block.seasonId &&
        [5, 7, 8].includes(fixture.stateId) &&
        fixture.raw.participants?.some((team) => team.id === block.teamId)
    )
    .toSorted((a, b) => (a.startingAt ?? 0) - (b.startingAt ?? 0) || a.id - b.id)
}
