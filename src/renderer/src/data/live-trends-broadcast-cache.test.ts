import { afterAll, beforeEach, expect, it } from 'vitest'
import type { BroadcastScheduleRefresh, SportmonksStanding } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  readLiveStandings,
  writeLiveStandingsRefresh,
  readFixtureTrends,
  writeFixtureTrendsRefresh,
  readBroadcastSchedule,
  writeBroadcastScheduleRefresh,
  writeStandingsRefresh,
  readStandingsQuery
} from './db'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

const standing: SportmonksStanding = {
  id: 1,
  participant_id: 19,
  league_id: 8,
  season_id: 12,
  stage_id: 1,
  group_id: null,
  round_id: 4,
  standing_rule_id: null,
  position: 1,
  result: 'up',
  points: 3
}

it('keeps live tables separate from current standings and other seasons', async () => {
  const input = { competitionId: 8, seasonId: 12 }
  await writeStandingsRefresh(12, { standings: [{ ...standing, points: 0 }], fetchedAt: 1000 })
  await writeLiveStandingsRefresh(input, { standings: [standing], fetchedAt: 2000 })
  await writeLiveStandingsRefresh(input, { standings: [], fetchedAt: 1000 })
  expect((await readLiveStandings(input))?.standings[0].raw.points).toBe(3)
  expect((await readStandingsQuery(12)).standings[0].raw.points).toBe(0)
  expect(await readLiveStandings({ ...input, seasonId: 13 })).toBeNull()
  await expect(
    writeLiveStandingsRefresh(
      { ...input, seasonId: 13 },
      { standings: [standing], fetchedAt: 3000 }
    )
  ).rejects.toThrow()
})

it('retains newer fixture trends and rejects a different fixture', async () => {
  const refresh = { fixtureId: 10, points: [], periods: [], fetchedAt: 2000 }
  await writeFixtureTrendsRefresh(10, refresh)
  await writeFixtureTrendsRefresh(10, { ...refresh, fetchedAt: 1000 })
  expect((await readFixtureTrends(10))?.fetchedAt).toBe(2000)
  expect(await readFixtureTrends(11)).toBeNull()
  await expect(writeFixtureTrendsRefresh(11, refresh)).rejects.toThrow()
})

it('keeps broadcast pages independent and preserves richer and newer shared fixtures', async () => {
  const input = { stationId: 34, feed: 'upcoming' as const, page: 1 }
  const fixture = {
    id: 10,
    league_id: 8,
    season_id: 12,
    state_id: 1,
    placeholder: false,
    has_odds: false,
    participants: [],
    scores: []
  }
  const refresh: BroadcastScheduleRefresh = {
    ...input,
    fixtures: [fixture],
    listings: [],
    hasMore: true,
    fetchedAt: 1000
  }
  await writeBroadcastScheduleRefresh(input, refresh)
  await db.fixtures.update(10, {
    raw: { ...fixture, events: [], statistics: [] },
    detailStaleAt: 9000,
    fetchedAt: 2000
  })
  await writeBroadcastScheduleRefresh(input, {
    ...refresh,
    fixtures: [{ ...fixture, state_id: 2 }],
    fetchedAt: 1500
  })
  expect((await readBroadcastSchedule(input))?.fixtures[0].raw.events).toEqual([])
  expect((await readBroadcastSchedule(input))?.fixtures[0].stateId).toBe(1)
  await writeBroadcastScheduleRefresh(
    { ...input, page: 2 },
    { ...refresh, page: 2, fixtures: [], hasMore: false }
  )
  expect((await readBroadcastSchedule(input))?.hasMore).toBe(true)
  expect((await readBroadcastSchedule({ ...input, page: 2 }))?.fixtures).toEqual([])
  expect(await readBroadcastSchedule({ ...input, feed: 'past' })).toBeNull()
  await expect(
    writeBroadcastScheduleRefresh(input, { ...refresh, stationId: 99 })
  ).rejects.toThrow()
  await writeBroadcastScheduleRefresh(input, { ...refresh, fixtures: [], fetchedAt: 1200 })
  expect((await readBroadcastSchedule(input))?.fixtures).toHaveLength(1)
})

it('clears all three features when credentials change', async () => {
  await writeLiveStandingsRefresh(
    { competitionId: 8, seasonId: 12 },
    { standings: [], fetchedAt: 1 }
  )
  await writeFixtureTrendsRefresh(10, { fixtureId: 10, points: [], periods: [], fetchedAt: 1 })
  await writeBroadcastScheduleRefresh(
    { stationId: 34, feed: 'past', page: 1 },
    {
      stationId: 34,
      feed: 'past',
      page: 1,
      fixtures: [],
      listings: [],
      hasMore: false,
      fetchedAt: 1
    }
  )
  await clearSportmonksCache()
  expect(await db.liveStandingQueries.count()).toBe(0)
  expect(await db.fixtureTrendsQueries.count()).toBe(0)
  expect(await db.broadcastScheduleQueries.count()).toBe(0)
})
