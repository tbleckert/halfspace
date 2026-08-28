import type { CachedFixture } from '@/data/db'

export function splitEntityFixtures(
  fixtures: readonly CachedFixture[],
  now: number
): { recent: CachedFixture[]; upcoming: CachedFixture[] } {
  const datedFixtures = fixtures.filter(
    (fixture): fixture is CachedFixture & { startingAt: number } => fixture.startingAt !== null
  )

  return {
    recent: datedFixtures
      .filter(({ startingAt }) => startingAt < now)
      .toSorted((left, right) => right.startingAt - left.startingAt)
      .slice(0, 5),
    upcoming: datedFixtures
      .filter(({ startingAt }) => startingAt >= now)
      .toSorted((left, right) => left.startingAt - right.startingAt)
      .slice(0, 5)
  }
}
