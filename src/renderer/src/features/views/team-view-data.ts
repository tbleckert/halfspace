import type { CachedFixture } from '@/data/db'

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
