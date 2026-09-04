import type { CachedFixture } from '@/data/db'
import { isFixtureOngoing } from '@/lib/fixture-state'

export function liveTickerFixtures(fixtures: CachedFixture[]): CachedFixture[] {
  return fixtures.filter(({ stateId }) => isFixtureOngoing(stateId))
}
