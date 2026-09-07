import { expect, it } from 'vitest'
import { fixtureSchema } from './sportmonks'

it('preserves an unknown venue country without rejecting the fixture window', () => {
  const fixture = fixtureSchema.parse({
    id: 1,
    league_id: 8,
    season_id: 1,
    state_id: 1,
    placeholder: false,
    has_odds: false,
    participants: [],
    scores: [],
    venue: { id: 2, name: 'Ground', country_id: null, city_id: 123 }
  })
  expect(fixture.venue?.country_id).toBeNull()
  expect(fixture.venue?.city_id).toBe(123)
})
