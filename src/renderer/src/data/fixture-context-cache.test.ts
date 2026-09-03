import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import { db, writeFixtureDetailRefresh, writeFixtureRefresh } from './db'

const fixture: SportmonksFixture = {
  id: 50,
  league_id: 8,
  season_id: 1,
  state_id: 5,
  placeholder: false,
  has_odds: false,
  participants: [],
  scores: [],
  weatherreport: { id: 1, fixture_id: 50, metric: 'celcius', current: { temp: 20 } },
  sidelined: [
    {
      id: 10,
      fixture_id: 50,
      participant_id: 51,
      player_id: 100,
      type_id: 595,
      player: {
        id: 100,
        name: 'Caleb Kporha',
        display_name: 'Caleb Kporha',
        position_id: 25,
        nationality_id: 462,
        sport_id: 1,
        country_id: 462,
        city_id: null,
        detailed_position_id: null,
        type_id: null,
        height: null,
        weight: null,
        date_of_birth: null,
        gender: 'male'
      }
    }
  ]
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})
afterAll(() => db.close())

describe('cached fixture context', () => {
  it('keeps absences and weather through a basic fixture-list refresh and hydrates player links', async () => {
    await writeFixtureDetailRefresh({ fixture, fetchedAt: 1_000 })
    await writeFixtureRefresh('2026-09-03', 'UTC', {
      fixtures: [{ ...fixture, weatherreport: undefined, sidelined: undefined }],
      fetchedAt: 2_000,
      pageCount: 1,
      timeZone: 'UTC'
    })
    expect((await db.fixtures.get(50))?.raw).toMatchObject({
      weatherreport: fixture.weatherreport,
      sidelined: fixture.sidelined
    })
    expect((await db.players.get(100))?.displayName).toBe('Caleb Kporha')
  })

  it('allows a new detail response to clear previously reported context', async () => {
    await writeFixtureDetailRefresh({ fixture, fetchedAt: 1_000 })
    await writeFixtureDetailRefresh({
      fixture: { ...fixture, weatherreport: null, sidelined: [] },
      fetchedAt: 2_000
    })
    expect((await db.fixtures.get(50))?.raw).toMatchObject({ weatherreport: null, sidelined: [] })
  })
})
