import type {
  FixtureRefresh,
  RefreshVenueFixturesInput,
  SportmonksFixture
} from '@shared/contracts'
import { isoDateInTimeZone } from '@/lib/date'
import { isFixtureOngoing } from '@/lib/fixture-state'
import { db, toCachedFixtures, type CachedFixture } from './db'

export interface VenueFixturesQuery extends RefreshVenueFixturesInput {
  key: string
  fixtureIds: number[]
  fetchedAt: number
  staleAt: number
}

export function venueFixturesKey(input: RefreshVenueFixturesInput): string {
  return `${input.venueId}|${input.startDate}|${input.endDate}|${input.timeZone}`
}

export async function readVenueFixtures(
  input: RefreshVenueFixturesInput
): Promise<(VenueFixturesQuery & { fixtures: CachedFixture[] }) | null> {
  const query = await db.venueFixtureQueries.get(venueFixturesKey(input))
  if (!query) return null
  const fixtures = (await db.fixtures.bulkGet(query.fixtureIds)).filter(
    (fixture): fixture is CachedFixture => !!fixture && matchesWindow(fixture.raw, input)
  )
  const staleAt = fixtures.some(({ stateId }) => isFixtureOngoing(stateId))
    ? Math.min(query.staleAt, query.fetchedAt + 30_000)
    : query.staleAt
  return { ...query, fixtures, staleAt }
}

export async function writeVenueFixturesRefresh(
  input: RefreshVenueFixturesInput,
  refresh: FixtureRefresh
): Promise<void> {
  if (
    refresh.timeZone !== input.timeZone ||
    refresh.fixtures.some((fixture) => !matchesWindow(fixture, input))
  ) {
    throw new Error('Fixtures do not match the selected venue window.')
  }
  const fixtures = [...new Map(refresh.fixtures.map((fixture) => [fixture.id, fixture])).values()]
  const key = venueFixturesKey(input)
  const staleAt =
    refresh.fetchedAt +
    (fixtures.some(({ state_id }) => isFixtureOngoing(state_id)) ? 30_000 : 60 * 60 * 1000)
  await db.transaction('rw', db.venueFixtureQueries, db.fixtures, async () => {
    const existing = await db.venueFixtureQueries.get(key)
    if (existing && existing.fetchedAt > refresh.fetchedAt) return
    await db.fixtures.bulkPut(await toCachedFixtures(fixtures, refresh.fetchedAt, staleAt))
    await db.venueFixtureQueries.put({
      ...input,
      key,
      fixtureIds: fixtures.map(({ id }) => id),
      fetchedAt: refresh.fetchedAt,
      staleAt
    })
  })
}

function matchesWindow(fixture: SportmonksFixture, input: RefreshVenueFixturesInput): boolean {
  if (fixture.venue_id !== input.venueId) return false
  if (fixture.starting_at_timestamp == null) return true
  const date = isoDateInTimeZone(fixture.starting_at_timestamp * 1000, input.timeZone)
  return date >= input.startDate && date <= input.endDate
}
