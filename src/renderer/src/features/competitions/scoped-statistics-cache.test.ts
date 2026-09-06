// @vitest-environment jsdom
import { afterAll, beforeEach, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readSeasonStatistics,
  readSeasonTopscorers,
  writeSeasonStatisticsRefresh,
  writeSeasonTopscorersRefresh
} from '@/data/db'
import { makeTopscorer } from '../../../../test/topscorer-fixtures'

beforeEach(clearSportmonksCache)
afterAll(() => db.close())

it('isolates season, stage, and round statistics and rejects older or mismatched responses', async () => {
  const write = (stageId?: number, roundId?: number, fetchedAt = 100): Promise<void> =>
    writeSeasonStatisticsRefresh(
      25591,
      {
        stageId,
        roundId,
        fetchedAt,
        statistics: [
          {
            id: 1,
            model_id: roundId ?? stageId ?? 25591,
            type_id: 188,
            value: { played: fetchedAt }
          }
        ]
      },
      stageId,
      roundId
    )
  await write()
  await write(10)
  await write(10, 20)
  await write(10, 21)
  await write(10, 20, 50)
  for (const [stageId, roundId] of [
    [undefined, undefined],
    [10, undefined],
    [10, 20],
    [10, 21]
  ]) {
    expect((await readSeasonStatistics(25591, stageId, roundId))?.fetchedAt).toBe(100)
  }
  expect(await readSeasonStatistics(25590, 10, 20)).toBeNull()
  await expect(
    writeSeasonStatisticsRefresh(25591, { fetchedAt: 200, stageId: 11, statistics: [] }, 10)
  ).rejects.toThrow()
  await clearSportmonksCache()
  expect(await readSeasonStatistics(25591, 10, 20)).toBeNull()
})

it('keeps stage leaders separate, hydrates identities, and retains newer snapshots', async () => {
  await writeSeasonTopscorersRefresh(25591, {
    fetchedAt: 100,
    topscorers: [makeTopscorer()],
    pageCount: 1
  })
  const data = {
    fetchedAt: 200,
    stageId: 10,
    topscorers: [makeTopscorer({ stage_id: 10, total: 3 })],
    pageCount: 1
  }
  await writeSeasonTopscorersRefresh(25591, data, 10)
  await writeSeasonTopscorersRefresh(25591, { ...data, fetchedAt: 100, topscorers: [] }, 10)
  expect((await readSeasonTopscorers(25591))?.topscorers[0].total).toBe(12)
  expect((await readSeasonTopscorers(25591, 10))?.topscorers[0].total).toBe(3)
  expect(await readSeasonTopscorers(25590, 10)).toBeNull()
  expect(await db.players.get(100)).toBeDefined()
  await expect(writeSeasonTopscorersRefresh(25591, { ...data, stageId: 11 }, 10)).rejects.toThrow()
  await clearSportmonksCache()
  expect(await readSeasonTopscorers(25591, 10)).toBeNull()
})
