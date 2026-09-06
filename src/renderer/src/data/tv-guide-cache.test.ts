import { afterAll, beforeEach, expect, it } from 'vitest'
import { db, clearSportmonksCache, readTvGuide, writeTvGuideRefresh } from './db'
import { watchableFixtures } from '@/features/broadcasts/tv-guide-data'
const input = { startDate: '2026-09-06', endDate: '2026-09-07', timeZone: 'UTC' }
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())
it('isolates windows, rejects late snapshots, sorts by kickoff and filters the selected day and exact broadcast countries', async () => {
  const fixtures = [1, 2, 3, 4].map((id) => ({
    id,
    league_id: 8,
    season_id: 12,
    state_id: id === 2 ? 3 : 1,
    starting_at_timestamp: Date.parse(`2026-09-0${id === 4 ? 7 : 6}T12:00:00Z`) / 1000 + id,
    placeholder: false,
    has_odds: false,
    participants: [],
    scores: []
  }))
  const listings = fixtures.map((f) => ({
    id: f.id,
    fixture_id: f.id,
    tvstation_id: 34,
    country_id: f.id === 3 ? 2 : 1,
    tvstation: { id: 34, name: 'Channel', url: null, image_path: null },
    country: { id: f.id === 3 ? 2 : 1, name: 'Country', image_path: null }
  }))
  await writeTvGuideRefresh(input, { ...input, fixtures, listings, fetchedAt: 2000 })
  await writeTvGuideRefresh(input, { ...input, fixtures: [], listings: [], fetchedAt: 1000 })
  const cached = (await readTvGuide(input))!
  expect(cached.fixtures).toHaveLength(4)
  expect(
    watchableFixtures(cached.fixtures, listings, '1', '2026-09-06', 'UTC').map((e) => e.fixture.id)
  ).toEqual([1, 2])
  expect(watchableFixtures(cached.fixtures, listings, '', '2026-09-06', 'UTC')).toEqual([])
  expect(
    watchableFixtures(cached.fixtures, listings, '1', '2026-09-07', 'UTC').map((e) => e.fixture.id)
  ).toEqual([4])
  for (const stateId of [5, 7, 8]) {
    const finished = cached.fixtures.map((fixture) => ({ ...fixture, stateId }))
    expect(watchableFixtures(finished, listings, '1', '2026-09-06', 'UTC')).toEqual([])
  }
  expect(await readTvGuide({ ...input, timeZone: 'Europe/Stockholm' })).toBeNull()
  await clearSportmonksCache()
  expect(await readTvGuide(input)).toBeNull()
})
