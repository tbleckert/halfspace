import type { SportmonksTvListing } from '@shared/contracts'
import type { CachedFixture } from '@/data/db'
import { tvGuideStations, type TvGuideStation } from '@/features/fixtures/tv-guide-data'
import { isoDateInTimeZone } from '@/lib/date'

export function watchableFixtures(
  fixtures: CachedFixture[],
  listings: SportmonksTvListing[],
  countryId: string,
  date: string,
  timeZone: string
): { fixture: CachedFixture; stations: TvGuideStation[] }[] {
  if (!countryId) return []
  return fixtures
    .filter(
      (fixture) =>
        ![5, 7, 8].includes(fixture.stateId) &&
        fixture.startingAt !== null &&
        isoDateInTimeZone(fixture.startingAt, timeZone) === date
    )
    .map((fixture) => ({
      fixture,
      stations: tvGuideStations(
        listings.filter((listing) => listing.fixture_id === fixture.id),
        countryId
      )
    }))
    .filter((entry) => entry.stations.length > 0)
    .sort(
      (a, b) =>
        (a.fixture.startingAt ?? 0) - (b.fixture.startingAt ?? 0) || a.fixture.id - b.fixture.id
    )
}
