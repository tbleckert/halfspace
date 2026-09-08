import { afterAll, beforeEach, expect, it } from 'vitest'
import type { SportmonksPlayer } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  readCompetitionCatalog,
  toCachedIncludedPlayer,
  writeCompetitionRefresh
} from './db'
import {
  readPlayerDirectory,
  writePlayerDirectory,
  readCountryCompetitions,
  writeCountryCompetitions,
  readTeamSeasons,
  writeTeamSeasons
} from './discovery-cache'

const player: SportmonksPlayer = {
  id: 1,
  sport_id: 1,
  country_id: 47,
  nationality_id: 462,
  city_id: null,
  position_id: null,
  detailed_position_id: null,
  type_id: null,
  name: 'Player',
  display_name: 'Player',
  height: null,
  weight: null,
  date_of_birth: null,
  gender: null
}
const competition = {
  id: 8,
  country_id: 47,
  name: 'League',
  active: true,
  country: { id: 47, name: 'Sweden' }
}
const season = { id: 12, league_id: 8, name: '2025/26', is_current: false }
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('isolates player pages and filters, preserves newer detail, and ignores late query results', async () => {
  await db.players.put({
    ...toCachedIncludedPlayer(
      { ...player, name: 'New name', city: { id: 1, name: 'Birthplace' } },
      undefined,
      200
    ),
    detailed: true
  })
  await writePlayerDirectory(
    { page: 1 },
    { page: 1, players: [player], hasMore: true, fetchedAt: 100 }
  )
  await writePlayerDirectory(
    { page: 2 },
    { page: 2, players: [{ ...player, id: 2 }], hasMore: false, fetchedAt: 100 }
  )
  expect((await readPlayerDirectory({ page: 1 })).players[0].name).toBe('New name')
  expect((await readPlayerDirectory({ page: 2 })).players.map(({ id }) => id)).toEqual([2])
  expect((await readPlayerDirectory({ page: 1, countryId: 47 })).query).toBeNull()
  expect((await readPlayerDirectory({ page: 1, query: 'Player' })).query).toBeNull()
  await writePlayerDirectory({ page: 1 }, { page: 1, players: [], hasMore: false, fetchedAt: 50 })
  expect((await readPlayerDirectory({ page: 1 })).query?.hasMore).toBe(true)
  await writePlayerDirectory(
    { page: 1 },
    { page: 1, players: [player], hasMore: false, fetchedAt: 300 }
  )
  expect((await db.players.get(1))?.raw.city?.name).toBe('Birthplace')
  await expect(
    writePlayerDirectory({ page: 1 }, { page: 2, players: [], hasMore: false, fetchedAt: 400 })
  ).rejects.toThrow('does not match')
})

it('keeps country browsing and season history separate from subscribed and current team membership', async () => {
  await writeCompetitionRefresh({
    competitions: [{ ...competition, currentseason: season }],
    fetchedAt: 100,
    pageCount: 1
  })
  await writeCountryCompetitions(
    { countryId: 47 },
    {
      countryId: 47,
      competitions: [competition, { ...competition, id: 9 }],
      fetchedAt: 200,
      pageCount: 2
    }
  )
  expect((await readCompetitionCatalog()).competitions.map(({ id }) => id)).toEqual([8])
  expect(
    (await readCountryCompetitions({ countryId: 47 })).competitions.map(({ id }) => id)
  ).toEqual([8, 9])
  expect((await readCountryCompetitions({ countryId: 9 })).query).toBeNull()
  await writeTeamSeasons(
    { teamId: 19 },
    {
      teamId: 19,
      seasons: [
        { ...season, league: { ...competition, country: undefined, currentseason: undefined } }
      ],
      fetchedAt: 300
    }
  )
  expect((await db.competitions.get(8))?.currentSeasonId).toBe(12)
  expect((await db.competitions.get(8))?.raw.country?.name).toBe('Sweden')
  expect(await db.teamCompetitionQueries.get(19)).toBeUndefined()
  expect((await readTeamSeasons({ teamId: 19 }))?.seasons).toHaveLength(1)
  await writeTeamSeasons({ teamId: 19 }, { teamId: 19, seasons: [], fetchedAt: 200 })
  expect((await readTeamSeasons({ teamId: 19 }))?.seasons).toHaveLength(1)
  await writeCountryCompetitions(
    { countryId: 47 },
    { countryId: 47, competitions: [], fetchedAt: 100, pageCount: 1 }
  )
  expect((await readCountryCompetitions({ countryId: 47 })).competitions).toHaveLength(2)
  await expect(
    writeTeamSeasons({ teamId: 20 }, { teamId: 19, seasons: [], fetchedAt: 400 })
  ).rejects.toThrow('does not match')
  await expect(
    writeCountryCompetitions(
      { countryId: 9 },
      { countryId: 47, competitions: [], fetchedAt: 400, pageCount: 1 }
    )
  ).rejects.toThrow('do not match')
})

it('clears every discovery query when credentials change', async () => {
  await writePlayerDirectory(
    { page: 1 },
    { page: 1, players: [player], fetchedAt: 100, hasMore: true }
  )
  await writeCountryCompetitions(
    { countryId: 47 },
    { countryId: 47, competitions: [competition], fetchedAt: 100, pageCount: 1 }
  )
  await writeTeamSeasons({ teamId: 19 }, { teamId: 19, seasons: [season], fetchedAt: 100 })
  await clearSportmonksCache()
  expect((await readPlayerDirectory({ page: 1 })).query).toBeNull()
  expect((await readCountryCompetitions({ countryId: 47 })).query).toBeNull()
  expect(await readTeamSeasons({ teamId: 19 })).toBeNull()
})

it('retains directory enrichments when a later fixture or leaderboard hydrates a basic player', async () => {
  const enriched = {
    ...player,
    nationality: { id: 462, name: 'England' },
    position_id: 26,
    position: { id: 26, name: 'Midfielder' }
  }
  await writePlayerDirectory(
    { page: 1 },
    { page: 1, players: [enriched], hasMore: false, fetchedAt: 100 }
  )
  const cached = await db.players.get(player.id)
  expect(cached?.detailed).toBe(false)
  await db.players.put(toCachedIncludedPlayer({ ...player, position_id: 26 }, cached, 200))
  const directory = await readPlayerDirectory({ page: 1 })
  expect(directory.players[0].raw.position?.name).toBe('Midfielder')
  expect(directory.players[0].raw.nationality?.name).toBe('England')
  expect(directory.players[0].detailed).toBe(false)
  const moved = toCachedIncludedPlayer(
    { ...player, nationality_id: 47, position_id: 27 },
    directory.players[0],
    300
  )
  expect(moved.raw.nationality).toBeUndefined()
  expect(moved.raw.position).toBeUndefined()
})
