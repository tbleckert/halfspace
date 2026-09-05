import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db, writeRefereeRefresh, writeFixtureDetailRefresh } from './db'
import {
  readSeasonReferees,
  readSeasonVenues,
  readStandingCorrections,
  readTeamSchedule,
  writeSeasonRefereesRefresh,
  writeSeasonVenuesRefresh,
  writeStandingCorrectionsRefresh,
  writeTeamScheduleRefresh
} from './season-resources-cache'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('keeps season directories separate while retaining richer and newer identities', async () => {
  const referee = { id: 1, name: 'Referee', display_name: 'Referee', country_id: null }
  await writeRefereeRefresh({
    referee: { ...referee, name: 'New name', statistics: [] },
    fetchedAt: 300
  })
  await writeSeasonRefereesRefresh(12, {
    seasonId: 12,
    referees: [referee, referee],
    fetchedAt: 100
  })
  await writeSeasonRefereesRefresh(13, { seasonId: 13, referees: [], fetchedAt: 200 })
  await writeSeasonRefereesRefresh(12, { seasonId: 12, referees: [], fetchedAt: 50 })
  expect((await readSeasonReferees(12))?.referees).toMatchObject([
    { raw: { name: 'New name', statistics: [] }, detailed: true }
  ])
  expect((await readSeasonReferees(13))?.referees).toEqual([])
  await writeSeasonVenuesRefresh(12, {
    seasonId: 12,
    venues: [{ id: 2, name: 'Ground', country: { id: 1, name: 'Country' } }],
    fetchedAt: 300
  })
  await writeSeasonVenuesRefresh(13, {
    seasonId: 13,
    venues: [{ id: 2, name: 'Old name' }],
    fetchedAt: 100
  })
  expect((await readSeasonVenues(13))?.venues[0].raw.country?.name).toBe('Country')
  expect((await readSeasonVenues(13))?.venues[0].name).toBe('Ground')
})

it('stores team schedules separately from full season schedules, preserves richer fixtures and shortens live freshness', async () => {
  const fixture = {
    id: 1,
    league_id: 8,
    season_id: 12,
    state_id: 2,
    placeholder: false,
    has_odds: false,
    participants: [{ id: 4, name: 'Club' }],
    scores: []
  }
  await writeFixtureDetailRefresh({ fixture: { ...fixture, events: [] }, fetchedAt: 100 })
  const refresh = {
    teamId: 4,
    seasonId: 12,
    fetchedAt: 200,
    stages: [
      {
        id: 2,
        season_id: 12,
        name: 'Stage',
        sort_order: 1,
        finished: false,
        is_current: true,
        fixtures: [fixture],
        rounds: []
      }
    ]
  }
  await writeTeamScheduleRefresh({ teamId: 4, seasonId: 12 }, refresh)
  await writeTeamScheduleRefresh(
    { teamId: 4, seasonId: 12 },
    { ...refresh, stages: [], fetchedAt: 150 }
  )
  const cached = await readTeamSchedule({ teamId: 4, seasonId: 12 })
  expect(cached?.fixtures[0].raw.events).toEqual([])
  expect(cached?.staleAt).toBe(30_200)
  expect(await db.seasonScheduleQueries.count()).toBe(0)
  expect(await readTeamSchedule({ teamId: 5, seasonId: 12 })).toBeNull()
})

it('rejects cross-query responses and clears all new seasonal queries with credentials', async () => {
  await expect(
    writeSeasonRefereesRefresh(12, { seasonId: 13, referees: [], fetchedAt: 1 })
  ).rejects.toThrow(/match/)
  await expect(
    writeSeasonVenuesRefresh(12, { seasonId: 13, venues: [], fetchedAt: 1 })
  ).rejects.toThrow(/match/)
  await expect(
    writeStandingCorrectionsRefresh(12, { seasonId: 13, corrections: [], fetchedAt: 1 })
  ).rejects.toThrow(/match/)
  await writeStandingCorrectionsRefresh(12, { seasonId: 12, corrections: [], fetchedAt: 1 })
  await writeSeasonRefereesRefresh(12, { seasonId: 12, referees: [], fetchedAt: 1 })
  await writeSeasonVenuesRefresh(12, { seasonId: 12, venues: [], fetchedAt: 1 })
  await writeTeamScheduleRefresh(
    { teamId: 4, seasonId: 12 },
    { teamId: 4, seasonId: 12, stages: [], fetchedAt: 1 }
  )
  await clearSportmonksCache()
  expect(await readSeasonReferees(12)).toBeNull()
  expect(await readSeasonVenues(12)).toBeNull()
  expect(await readStandingCorrections(12)).toBeNull()
  expect(await readTeamSchedule({ teamId: 4, seasonId: 12 })).toBeNull()
})
