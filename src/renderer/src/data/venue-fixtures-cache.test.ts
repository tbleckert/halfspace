import { afterAll, beforeEach, expect, it } from 'vitest'
import type { FixtureRefresh, SportmonksFixture } from '@shared/contracts'
import { clearSportmonksCache, db } from './db'
import { readVenueFixtures, writeVenueFixturesRefresh } from './venue-fixtures-cache'

const input = { venueId: 206, startDate: '2026-08-13', endDate: '2026-10-12', timeZone: 'UTC' }
const fixture: SportmonksFixture = {
  id: 1,
  venue_id: 206,
  league_id: 8,
  season_id: 1,
  state_id: 5,
  starting_at_timestamp: Date.parse('2026-09-10T19:00:00Z') / 1000,
  placeholder: false,
  has_odds: false,
  scores: [],
  participants: []
}
const refresh = (fixtures: SportmonksFixture[], fetchedAt: number): FixtureRefresh => ({
  fixtures,
  fetchedAt,
  timeZone: 'UTC',
  pageCount: 1
})
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('isolates venue windows, preserves richer shared detail, ignores late writes and clears query caches', async () => {
  await writeVenueFixturesRefresh(
    input,
    refresh(
      [
        {
          ...fixture,
          weatherreport: { id: 1, fixture_id: 1, temperature: { current: 20 }, metric: 'celcius' }
        }
      ],
      200
    )
  )
  await writeVenueFixturesRefresh(input, refresh([fixture], 300))
  await writeVenueFixturesRefresh(input, refresh([], 100))
  const cached = await readVenueFixtures(input)
  expect(cached?.fixtures).toHaveLength(1)
  expect(cached?.fixtures[0].raw.weatherreport).toBeTruthy()
  expect(cached?.fetchedAt).toBe(300)
  expect(await readVenueFixtures({ ...input, venueId: 890 })).toBeNull()
  expect(await readVenueFixtures({ ...input, timeZone: 'Europe/Stockholm' })).toBeNull()
  expect(await readVenueFixtures({ ...input, endDate: '2026-10-11' })).toBeNull()
  await clearSportmonksCache()
  expect(await readVenueFixtures(input)).toBeNull()
})

it('rejects mismatched venue, date and time zone without poisoning the cache', async () => {
  for (const result of [
    refresh([{ ...fixture, venue_id: 890 }], 100),
    refresh([{ ...fixture, starting_at_timestamp: Date.parse('2020-01-01') / 1000 }], 100),
    { ...refresh([fixture], 100), timeZone: 'Asia/Tokyo' }
  ])
    await expect(writeVenueFixturesRefresh(input, result)).rejects.toThrow()
  expect(await readVenueFixtures(input)).toBeNull()
  expect(await db.fixtures.count()).toBe(0)
})

it('distinguishes an empty response and uses a short expiry for ongoing games', async () => {
  await writeVenueFixturesRefresh(input, refresh([], 100))
  expect((await readVenueFixtures(input))?.fixtures).toEqual([])
  await writeVenueFixturesRefresh(input, refresh([{ ...fixture, state_id: 3 }], 200))
  expect((await readVenueFixtures(input))?.staleAt).toBe(30_200)
})

it('stops showing fixtures that another query moves to a different venue', async () => {
  await writeVenueFixturesRefresh(input, refresh([fixture], 100))
  await writeVenueFixturesRefresh(
    { ...input, venueId: 890 },
    refresh([{ ...fixture, venue_id: 890 }], 200)
  )
  expect((await readVenueFixtures(input))?.fixtures).toEqual([])
})

it('refreshes within 30 seconds when shared live data marks a cached match as ongoing', async () => {
  await writeVenueFixturesRefresh(input, refresh([fixture], 100))
  await db.fixtures.update(fixture.id, {
    stateId: 2,
    raw: { ...fixture, state_id: 2 },
    fetchedAt: 200
  })
  expect((await readVenueFixtures(input))?.staleAt).toBe(30_100)
})
