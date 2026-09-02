import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readRefereeIdentity,
  writeRefereeRefresh,
  writeFixtureDetailRefresh
} from '@/data/db'
import type { SportmonksFixture, SportmonksReferee } from '@shared/contracts'

const fixture: SportmonksFixture = {
  id: 50,
  league_id: 8,
  season_id: 10,
  state_id: 5,
  placeholder: false,
  has_odds: false,
  participants: [],
  scores: [],
  starting_at_timestamp: 1788300000
}
const referee: SportmonksReferee = {
  id: 7,
  name: 'Alex Official',
  display_name: 'A. Official',
  country_id: 462
}
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

describe('referee cache', () => {
  it('normalizes recent fixtures while preserving their richer match detail', async () => {
    await writeFixtureDetailRefresh({
      fetchedAt: Date.now(),
      fixture: { ...fixture, venue: { id: 1, name: 'Stadium' } }
    })
    await writeRefereeRefresh({
      referee: {
        ...referee,
        latest: [
          {
            id: 1,
            referee_id: 7,
            fixture_id: 50,
            type_id: 6,
            type: { id: 6, name: 'Referee' },
            fixture
          }
        ]
      },
      fetchedAt: Date.now()
    })
    const cached = await readRefereeIdentity(7)
    expect(cached.referee?.detailed).toBe(true)
    expect(cached.appointments[0].fixture.raw.venue?.name).toBe('Stadium')
    expect(cached.appointments[0].role).toBe('Referee')
    await writeFixtureDetailRefresh({
      fetchedAt: Date.now(),
      fixture: {
        ...fixture,
        referees: [{ id: 1, referee_id: 7, fixture_id: 50, type_id: 6, referee }]
      }
    })
    expect((await readRefereeIdentity(7)).appointments).toHaveLength(1)
    expect((await readRefereeIdentity(7)).referee?.detailed).toBe(true)
  })
})
