import { afterAll, beforeEach, expect, it } from 'vitest'
import type { SportmonksOdd, SportmonksTeamOfWeekEntry } from '@shared/contracts'
import { makeTopscorer } from '../../../test/topscorer-fixtures'
import {
  clearSportmonksCache,
  db,
  readFixtureOdds,
  readTeamOfWeek,
  writeFixtureOddsRefresh,
  writeTeamOfWeekRefresh
} from './db'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('isolates pre-match and in-play quotes, including overlapping provider IDs and empty responses', async () => {
  const quote: SportmonksOdd = {
    id: 1,
    fixture_id: 10,
    market_id: 1,
    bookmaker_id: 2,
    label: 'Home',
    value: '1.80'
  }
  await writeFixtureOddsRefresh(10, 'pre-match', { odds: [quote], fetchedAt: 1000 })
  await writeFixtureOddsRefresh(10, 'inplay', {
    odds: [{ ...quote, value: '2.50', suspended: true }],
    fetchedAt: 2000
  })
  expect((await readFixtureOdds(10, 'pre-match')).odds[0].raw.value).toBe('1.80')
  expect((await readFixtureOdds(10, 'inplay')).odds[0].raw).toMatchObject({
    value: '2.50',
    suspended: true
  })
  await writeFixtureOddsRefresh(10, 'inplay', { odds: [], fetchedAt: 3000 })
  expect(await readFixtureOdds(10, 'inplay')).toMatchObject({ query: { oddIds: [] }, odds: [] })
  expect((await readFixtureOdds(10, 'pre-match')).odds).toHaveLength(1)
  expect((await readFixtureOdds(11, 'inplay')).query).toBeNull()
  await clearSportmonksCache()
  expect((await readFixtureOdds(10, 'inplay')).query).toBeNull()
  expect((await readFixtureOdds(10, 'pre-match')).query).toBeNull()
})

it('retains separate latest and historical selections while hydrating shared player and team identities', async () => {
  const scorer = makeTopscorer()
  const entry: SportmonksTeamOfWeekEntry = {
    id: 1,
    player_id: scorer.player_id,
    team_id: 37,
    fixture_id: 10,
    round_id: 5,
    rating: 8.2,
    formation_position: 1,
    formation: '4-4-2',
    player: scorer.player!,
    team: scorer.participant!,
    round: { id: 5, league_id: 8, season_id: 20, name: '2' }
  }
  await writeTeamOfWeekRefresh({ competitionId: 8 }, { entries: [entry], fetchedAt: 1000 })
  await writeTeamOfWeekRefresh({ competitionId: 8, roundId: 4 }, { entries: [], fetchedAt: 2000 })
  expect(await readTeamOfWeek({ competitionId: 8 })).toMatchObject({
    entries: [{ rating: 8.2 }],
    staleAt: 3601000
  })
  expect(await readTeamOfWeek({ competitionId: 8, roundId: 4 })).toMatchObject({ entries: [] })
  expect(await readTeamOfWeek({ competitionId: 9 })).toBeNull()
  expect((await db.players.get(scorer.player_id))?.name).toBe(scorer.player!.display_name)
  expect((await db.teams.get(37))?.name).toBe(scorer.participant!.name)
  await clearSportmonksCache()
  expect(await readTeamOfWeek({ competitionId: 8 })).toBeNull()
})
