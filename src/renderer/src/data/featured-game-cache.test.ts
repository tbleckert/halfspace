import { afterAll, beforeEach, expect, it } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import { clearSportmonksCache, db, writeFixtureRefresh } from './db'
import { persistFeaturedSelection } from '@/features/fixtures/featured-game-data'

const date = '2026-09-07'
const timeZone = 'UTC'
function fixtures(state = 1): SportmonksFixture[] {
  return Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    league_id: 999,
    season_id: 1,
    state_id: state,
    placeholder: false,
    has_odds: false,
    starting_at_timestamp: 1788796800 + index * 3600,
    participants: [
      { id: index * 2 + 1, name: 'Home', meta: { location: 'home' } },
      { id: index * 2 + 2, name: 'Away', meta: { location: 'away' } }
    ],
    scores: []
  }))
}
beforeEach(async () => {
  await clearSportmonksCache()
  await db.teamPins.clear()
  await db.competitionPins.clear()
})
afterAll(() => db.close())

it('persists a day-scoped choice and rotates using the latest transactional fixture state', async () => {
  const games = fixtures()
  await writeFixtureRefresh(date, timeZone, {
    fixtures: games,
    fetchedAt: 100,
    pageCount: 1,
    timeZone
  })
  await persistFeaturedSelection(date, timeZone, 200)
  expect((await db.featuredGameSelections.get(`${date}|${timeZone}`))?.fixtureId).toBe(1)
  games[0] = { ...games[0], state_id: 5 }
  await writeFixtureRefresh(date, timeZone, {
    fixtures: games,
    fetchedAt: 300,
    pageCount: 1,
    timeZone
  })
  await Promise.all([
    persistFeaturedSelection(date, timeZone, 400),
    persistFeaturedSelection(date, timeZone, 401)
  ])
  expect((await db.featuredGameSelections.get(`${date}|${timeZone}`))?.fixtureId).toBe(2)
  await persistFeaturedSelection('2026-09-08', timeZone, 500)
  expect(await db.featuredGameSelections.get('2026-09-08|UTC')).toBeUndefined()
})
