import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { EntitySearchRefresh, SportmonksFixture } from '@shared/contracts'
import {
  db,
  readEntitySearch,
  readRefereeIdentity,
  writeEntitySearchRefresh,
  writeFixtureDetailRefresh,
  writeRefereeRefresh
} from '@/data/db'

const fixture: SportmonksFixture = {
  id: 50,
  league_id: 384,
  season_id: 1,
  state_id: 5,
  name: 'Lecce vs Roma',
  starting_at_timestamp: 1_788_200_000,
  placeholder: false,
  has_odds: true,
  participants: [{ id: 37, name: 'Roma', meta: { location: 'away' } }],
  scores: [],
  league: { id: 384, name: 'Serie A' }
}
const referee = {
  id: 14468,
  name: 'John Beaton',
  display_name: 'J. Beaton',
  country_id: 1161,
  country: { id: 1161, name: 'Scotland' }
}

function searchRefresh(): EntitySearchRefresh {
  return {
    competitions: [],
    teams: [],
    players: [],
    coaches: [],
    venues: [],
    referees: [referee],
    fixtures: [fixture],
    fetchedAt: 1_000
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})
afterAll(() => db.close())

describe('match and referee search cache', () => {
  it('makes remote matches and referee identities searchable offline', async () => {
    await writeEntitySearchRefresh(searchRefresh())
    const matches = await readEntitySearch('Roma')
    expect(matches[0]).toMatchObject({ type: 'fixture', id: 50, name: 'Lecce vs Roma' })
    expect(matches[0].subtitle).toContain('Serie A')
    expect(matches[0].fixture?.startingAt).toBe(1_788_200_000_000)
    expect(await readEntitySearch('John Beaton')).toMatchObject([
      { type: 'referee', id: 14468, subtitle: 'Referee · Scotland' }
    ])
    expect((await readRefereeIdentity(14468)).referee?.detailed).toBe(false)
  })

  it('preserves match detail and referee appointments when search updates their identity', async () => {
    await writeFixtureDetailRefresh({
      fixture: { ...fixture, lineups: [], events: [], venue: { id: 10, name: 'Stadium' } },
      fetchedAt: 900
    })
    await writeRefereeRefresh({
      referee: {
        ...referee,
        latest: [{ id: 1, referee_id: referee.id, fixture_id: fixture.id, type_id: 6, fixture }]
      },
      fetchedAt: 900
    })
    await writeEntitySearchRefresh(searchRefresh())
    expect((await db.fixtures.get(50))?.raw).toMatchObject({
      lineups: [],
      events: [],
      venue: { name: 'Stadium' }
    })
    const cached = (await readRefereeIdentity(14468)).referee
    expect(cached?.detailed).toBe(true)
    expect(cached?.appointments).toEqual([{ fixtureId: 50, role: 'Match official' }])
    expect(cached?.staleAt).toBe(900 + 86_400_000)
  })

  it('keeps newer match scores when an older search response arrives', async () => {
    await writeFixtureDetailRefresh({
      fixture: { ...fixture, result_info: 'Newer result' },
      fetchedAt: 2_000
    })
    await writeEntitySearchRefresh(searchRefresh())
    expect((await db.fixtures.get(50))?.resultInfo).toBe('Newer result')
  })

  it('puts the latest matching fixtures first and limits the match group', async () => {
    await writeEntitySearchRefresh({
      ...searchRefresh(),
      fixtures: Array.from({ length: 7 }, (_, index) => ({
        ...fixture,
        id: index + 1,
        starting_at_timestamp: 1_788_200_000 + index * 86_400
      }))
    })
    expect((await readEntitySearch('Lecce vs Roma')).map(({ id }) => id)).toEqual([7, 6, 5, 4, 3])
  })
})
