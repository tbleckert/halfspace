import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type {
  CompetitionRefresh,
  FixtureRefresh,
  RefreshCompetitionFixturesInput,
  RefreshTeamFixturesInput,
  StandingsRefresh,
  TeamRefresh,
  VenueRefresh
} from '@shared/contracts'
import {
  db,
  readCompetitionCatalog,
  readCompetitionFixtureQuery,
  readFixtureQuery,
  readStandingsQuery,
  readTeamFixtureQuery,
  readTeamIdentity,
  readVenueIdentity,
  readVenueTeams,
  setCompetitionPinned,
  writeCompetitionFixtureRefresh,
  writeCompetitionRefresh,
  writeFixtureRefresh,
  writeStandingsRefresh,
  writeTeamFixtureRefresh,
  writeTeamRefresh,
  writeVenueRefresh
} from './db'

beforeEach(async () => {
  if (!db.isOpen()) await db.open()

  await db.transaction(
    'rw',
    [
      db.fixtures,
      db.fixtureQueries,
      db.competitions,
      db.competitionCatalogs,
      db.competitionPins,
      db.standings,
      db.standingQueries,
      db.competitionFixtureQueries,
      db.teams,
      db.teamFixtureQueries,
      db.venues
    ],
    async () => {
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
      await db.competitionPins.clear()
      await db.standings.clear()
      await db.standingQueries.clear()
      await db.competitionFixtureQueries.clear()
      await db.teams.clear()
      await db.teamFixtureQueries.clear()
      await db.venues.clear()
    }
  )
})

afterAll(() => db.close())

describe('fixture cache', () => {
  it('writes the query and fixtures together while respecting participant locations', async () => {
    const refresh: FixtureRefresh = {
      fetchedAt: Date.UTC(2026, 7, 27, 10),
      pageCount: 1,
      timeZone: 'Europe/Stockholm',
      fixtures: [
        {
          id: 19425456,
          league_id: 8,
          season_id: 23614,
          state_id: 1,
          name: 'Away vs Home',
          starting_at_timestamp: 1_787_848_400,
          placeholder: false,
          has_odds: true,
          participants: [
            { id: 22, name: 'Away', meta: { location: 'away' } },
            { id: 11, name: 'Home', meta: { location: 'home' } }
          ],
          scores: []
        }
      ]
    }

    await writeFixtureRefresh('2026-08-27', 'Europe/Stockholm', refresh)
    const cached = await readFixtureQuery('2026-08-27', 'Europe/Stockholm')

    expect(cached.query?.fixtureIds).toEqual([19425456])
    expect(cached.fixtures[0]).toMatchObject({
      homeTeamId: 11,
      awayTeamId: 22
    })
  })

  it('caches an empty provider response', async () => {
    await writeFixtureRefresh('2026-08-28', 'UTC', {
      fetchedAt: Date.UTC(2026, 7, 27, 10),
      pageCount: 1,
      timeZone: 'UTC',
      fixtures: []
    })

    const cached = await readFixtureQuery('2026-08-28', 'UTC')
    expect(cached.query).not.toBeNull()
    expect(cached.fixtures).toEqual([])
  })
})

describe('competition cache', () => {
  it('replaces the subscribed catalogue while preserving local pins', async () => {
    const firstRefresh = competitionRefresh([
      { id: 8, name: 'Premier League' },
      { id: 384, name: 'Serie A' }
    ])

    await writeCompetitionRefresh(firstRefresh)
    await setCompetitionPinned(384, true)
    await writeCompetitionRefresh(competitionRefresh([{ id: 384, name: 'Serie A' }]))

    const cached = await readCompetitionCatalog()
    expect(cached.competitions.map(({ id }) => id)).toEqual([384])
    expect(await db.competitionPins.get(384)).toMatchObject({ competitionId: 384 })
  })

  it('keeps the current season on the cached competition', async () => {
    const refresh = competitionRefresh([{ id: 8, name: 'Premier League' }])
    refresh.competitions[0].currentseason = {
      id: 23614,
      league_id: 8,
      name: '2026/2027',
      is_current: true
    }

    await writeCompetitionRefresh(refresh)

    expect((await db.competitions.get(8))?.currentSeasonId).toBe(23614)
  })
})

describe('competition workspace cache', () => {
  it('writes and reads a season standings snapshot', async () => {
    const refresh: StandingsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      standings: [
        {
          id: 1,
          participant_id: 10,
          league_id: 8,
          season_id: 23614,
          stage_id: 1,
          group_id: null,
          round_id: null,
          standing_rule_id: 1,
          position: 1,
          result: 'overall',
          points: 84,
          participant: { id: 10, name: 'Home' }
        }
      ]
    }

    await writeStandingsRefresh(23614, refresh)
    const cached = await readStandingsQuery(23614)

    expect(cached.query?.standingIds).toEqual([1])
    expect(cached.standings[0].raw.participant?.name).toBe('Home')
    expect((await readTeamIdentity(10)).participant?.name).toBe('Home')
  })

  it('reuses normalized fixtures for a competition range', async () => {
    const input: RefreshCompetitionFixturesInput = {
      competitionId: 8,
      startDate: '2026-08-14',
      endDate: '2026-09-11',
      timeZone: 'Europe/Stockholm'
    }
    const refresh = fixtureRefresh(19425456, 'Original')

    await writeFixtureRefresh('2026-08-28', 'Europe/Stockholm', refresh)
    await writeCompetitionFixtureRefresh(input, {
      ...refresh,
      fixtures: [{ ...refresh.fixtures[0], name: 'Updated' }]
    })

    const cached = await readCompetitionFixtureQuery(input)
    expect(cached.fixtures[0].name).toBe('Updated')
    expect(await db.fixtures.count()).toBe(1)
  })
})

describe('team entity cache', () => {
  it('writes and reads a detailed team entity', async () => {
    const refresh: TeamRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      team: {
        id: 9,
        sport_id: 1,
        country_id: 462,
        venue_id: 206,
        gender: 'male',
        name: 'Manchester City',
        short_code: 'MCI',
        image_path: 'https://cdn.sportmonks.com/images/soccer/teams/9/9.png',
        founded: 1880,
        placeholder: false,
        country: { id: 462, name: 'England' },
        venue: { id: 206, name: 'Etihad Stadium', capacity: 55097 }
      }
    }

    await writeTeamRefresh(refresh)
    const identity = await readTeamIdentity(9)

    expect(identity.team?.name).toBe('Manchester City')
    expect(identity.team?.raw.venue?.name).toBe('Etihad Stadium')
    expect((await readVenueIdentity(206)).summary?.name).toBe('Etihad Stadium')
  })

  it('reuses normalized fixtures for a team range', async () => {
    const input: RefreshTeamFixturesInput = {
      teamId: 9,
      startDate: '2026-08-14',
      endDate: '2026-09-11',
      timeZone: 'Europe/Stockholm'
    }
    const refresh = fixtureRefresh(19425456, 'Original')
    refresh.fixtures[0].participants = [
      { id: 9, name: 'Manchester City', meta: { location: 'home' } },
      { id: 10, name: 'Away', meta: { location: 'away' } }
    ]

    await writeFixtureRefresh('2026-08-28', 'Europe/Stockholm', refresh)
    await writeTeamFixtureRefresh(input, {
      ...refresh,
      fixtures: [{ ...refresh.fixtures[0], name: 'Updated' }]
    })

    const cached = await readTeamFixtureQuery(input)
    expect(cached.fixtures[0].name).toBe('Updated')
    expect(await db.fixtures.count()).toBe(1)
  })
})

describe('venue entity cache', () => {
  it('writes and reads a detailed venue entity', async () => {
    const refresh: VenueRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      venue: {
        id: 206,
        country_id: 462,
        city_id: 28146,
        name: 'Etihad Stadium',
        address: 'Rowsley Street',
        zipcode: 'M11 3FF',
        latitude: '53.483111',
        longitude: '-2.200397',
        capacity: 55097,
        image_path: 'https://cdn.sportmonks.com/images/soccer/venues/14/206.png',
        city_name: 'Manchester',
        surface: 'grass',
        national_team: false,
        country: { id: 462, name: 'England' }
      }
    }

    await writeVenueRefresh(refresh)
    const identity = await readVenueIdentity(206)

    expect(identity.venue?.name).toBe('Etihad Stadium')
    expect(identity.venue?.raw.country?.name).toBe('England')
  })

  it('finds cached teams that use the venue', async () => {
    await writeTeamRefresh({
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      team: {
        id: 9,
        sport_id: 1,
        country_id: 462,
        venue_id: 206,
        gender: 'male',
        name: 'Manchester City',
        founded: 1880,
        placeholder: false
      }
    })

    expect((await readVenueTeams(206)).map(({ name }) => name)).toEqual(['Manchester City'])
  })
})

function competitionRefresh(competitions: Array<{ id: number; name: string }>): CompetitionRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    pageCount: 1,
    competitions: competitions.map(({ id, name }) => ({
      id,
      country_id: 1,
      name,
      active: true,
      image_path: `https://cdn.sportmonks.com/images/soccer/leagues/${id}.png`
    }))
  }
}

function fixtureRefresh(id: number, name: string): FixtureRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    pageCount: 1,
    timeZone: 'Europe/Stockholm',
    fixtures: [
      {
        id,
        league_id: 8,
        season_id: 23614,
        state_id: 1,
        name,
        starting_at_timestamp: 1_787_848_400,
        placeholder: false,
        has_odds: false,
        participants: [],
        scores: []
      }
    ]
  }
}
