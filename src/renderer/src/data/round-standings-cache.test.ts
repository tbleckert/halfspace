import { afterAll, beforeEach, expect, it } from 'vitest'
import type { SportmonksStanding } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  readRoundStandings,
  readStandingsQuery,
  writeRoundStandingsRefresh,
  writeStandingsRefresh
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
  result: 'equal',
  points: 3
}

it('keeps overlapping standing IDs separate for each round and the current table', async () => {
  await writeStandingsRefresh(12, { standings: [{ ...standing, points: 9 }], fetchedAt: 1000 })
  await writeRoundStandingsRefresh(
    { seasonId: 12, roundId: 4 },
    { standings: [standing], fetchedAt: 1000 }
  )
  await writeRoundStandingsRefresh(
    { seasonId: 12, roundId: 5 },
    { standings: [{ ...standing, round_id: 5, points: 6 }], fetchedAt: 1000 }
  )
  expect((await readStandingsQuery(12)).standings[0].raw.points).toBe(9)
  expect((await readRoundStandings({ seasonId: 12, roundId: 4 }))?.standings[0].raw.points).toBe(3)
  expect((await readRoundStandings({ seasonId: 12, roundId: 5 }))?.standings[0].raw.points).toBe(6)
  expect(await readRoundStandings({ seasonId: 13, roundId: 4 })).toBeNull()
  await clearSportmonksCache()
  expect(await readRoundStandings({ seasonId: 12, roundId: 4 })).toBeNull()
})

it('retains newer round snapshots and records a successful empty response', async () => {
  const input = { seasonId: 12, roundId: 4 }
  await writeRoundStandingsRefresh(input, { standings: [standing], fetchedAt: 2000 })
  await writeRoundStandingsRefresh(input, { standings: [], fetchedAt: 1000 })
  expect((await readRoundStandings(input))?.standings).toHaveLength(1)
  await writeRoundStandingsRefresh(input, { standings: [], fetchedAt: 3000 })
  expect((await readRoundStandings(input))?.standings).toEqual([])
})

it('does not roll the current table back when an older request completes last', async () => {
  await writeStandingsRefresh(12, { standings: [], fetchedAt: 3000 })
  await writeStandingsRefresh(12, { standings: [standing], fetchedAt: 1000 })
  expect((await readStandingsQuery(12)).standings).toEqual([])
})
