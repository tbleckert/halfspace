import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readSeasonTeams,
  readTeamCompetitions,
  writeCompetitionDetailRefresh,
  writeCompetitionRefresh,
  writeSeasonTeamsRefresh,
  writeTeamCompetitionsRefresh,
  writeTeamRefresh
} from './db'

const competition = { id: 8, country_id: 462, name: 'League', active: true }
const team = {
  id: 1,
  sport_id: 1,
  country_id: 462,
  venue_id: null,
  gender: 'male',
  name: 'Club',
  founded: null,
  placeholder: false
}

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

describe('entity discovery cache', () => {
  it('keeps season membership separate, deduplicates teams, and retains richer and newer identities', async () => {
    await writeTeamRefresh({ team: { ...team, name: 'New name', sidelined: [] }, fetchedAt: 300 })
    await writeSeasonTeamsRefresh(10, {
      seasonId: 10,
      teams: [team, team],
      fetchedAt: 100,
      pageCount: 1
    })
    await writeSeasonTeamsRefresh(11, { seasonId: 11, teams: [], fetchedAt: 200, pageCount: 1 })
    expect((await readSeasonTeams(10))?.teams).toMatchObject([
      { name: 'New name', raw: { sidelined: [] } }
    ])
    expect((await readSeasonTeams(11))?.teams).toEqual([])
    await writeSeasonTeamsRefresh(10, { seasonId: 10, teams: [], fetchedAt: 50, pageCount: 1 })
    expect((await readSeasonTeams(10))?.teams).toHaveLength(1)
  })

  it('refreshes membership without adding to subscriptions or erasing identities', async () => {
    await writeCompetitionRefresh({ competitions: [competition], fetchedAt: 100, pageCount: 1 })
    await writeTeamCompetitionsRefresh(1, {
      teamId: 1,
      competitions: [{ ...competition, id: 9 }],
      fetchedAt: 200,
      pageCount: 1
    })
    expect((await readTeamCompetitions(1))?.competitions.map(({ id }) => id)).toEqual([9])
    expect((await db.competitionCatalogs.toArray())[0].competitionIds).toEqual([8])
    await writeTeamCompetitionsRefresh(1, {
      teamId: 1,
      competitions: [],
      fetchedAt: 300,
      pageCount: 1
    })
    await writeTeamCompetitionsRefresh(1, {
      teamId: 1,
      competitions: [competition],
      fetchedAt: 250,
      pageCount: 1
    })
    expect((await readTeamCompetitions(1))?.competitions).toEqual([])
    expect(await db.competitions.get(9)).toBeDefined()
  })

  it('retains direct details across older catalog refreshes', async () => {
    await writeCompetitionDetailRefresh(8, {
      competition: { ...competition, name: 'New name', country: { id: 462, name: 'England' } },
      fetchedAt: 300
    })
    await writeCompetitionRefresh({ competitions: [competition], fetchedAt: 100, pageCount: 1 })
    expect(await db.competitions.get(8)).toMatchObject({
      name: 'New name',
      raw: { country: { name: 'England' } }
    })
    expect((await db.competitionDetailQueries.get(8))?.fetchedAt).toBe(300)
  })

  it('rejects responses for another query', async () => {
    await expect(
      writeSeasonTeamsRefresh(10, { seasonId: 11, teams: [], fetchedAt: 1, pageCount: 1 })
    ).rejects.toThrow(/match/)
    await expect(
      writeTeamCompetitionsRefresh(1, { teamId: 2, competitions: [], fetchedAt: 1, pageCount: 1 })
    ).rejects.toThrow(/match/)
    await expect(writeCompetitionDetailRefresh(9, { competition, fetchedAt: 1 })).rejects.toThrow(
      /match/
    )
  })

  it('clears every discovery query when credentials change', async () => {
    await writeSeasonTeamsRefresh(10, { seasonId: 10, teams: [team], fetchedAt: 1, pageCount: 1 })
    await writeTeamCompetitionsRefresh(1, {
      teamId: 1,
      competitions: [competition],
      fetchedAt: 1,
      pageCount: 1
    })
    await writeCompetitionDetailRefresh(8, { competition, fetchedAt: 1 })
    await clearSportmonksCache()
    expect(await readSeasonTeams(10)).toBeNull()
    expect(await readTeamCompetitions(1)).toBeNull()
    expect(await db.competitionDetailQueries.get(8)).toBeUndefined()
  })
})
