import { afterAll, beforeEach, expect, it } from 'vitest'
import {
  db,
  clearSportmonksCache,
  readExpectedLineups,
  writeExpectedLineupsRefresh,
  readFixtureExpectedMetrics,
  writeFixtureExpectedMetricsRefresh,
  readFixturePredictions,
  writeFixturePredictionsRefresh,
  readFixturePeriodStatistics,
  writeFixturePeriodStatisticsRefresh
} from './db'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it.each([
  {
    name: 'expected lineups',
    read: readExpectedLineups,
    write: writeExpectedLineupsRefresh,
    data: { fixtureId: 10, lineups: [], fetchedAt: 2000 }
  },
  {
    name: 'expected metrics',
    read: readFixtureExpectedMetrics,
    write: writeFixtureExpectedMetricsRefresh,
    data: { fixtureId: 10, statistics: [], fetchedAt: 2000 }
  },
  {
    name: 'predictions',
    read: readFixturePredictions,
    write: writeFixturePredictionsRefresh,
    data: { fixtureId: 10, predictions: [], fetchedAt: 2000 }
  },
  {
    name: 'period statistics',
    read: readFixturePeriodStatistics,
    write: writeFixturePeriodStatisticsRefresh,
    data: { fixtureId: 10, periods: [], fetchedAt: 2000 }
  }
])(
  'caches $name by fixture, rejects mismatches, and preserves newer responses',
  async ({ read, write, data }) => {
    // Each case pairs a writer with its own response shape.
    const save = write as (id: number, payload: typeof data) => Promise<void>
    await save(10, data)
    expect(await read(10)).toMatchObject(data)
    expect(await read(11)).toBeNull()
    await expect(save(11, data)).rejects.toThrow(/fixture/i)
    await save(10, { ...data, fetchedAt: 1000 })
    expect((await read(10))?.fetchedAt).toBe(2000)
    expect(await db.fixtures.get(10)).toBeUndefined()
    await clearSportmonksCache()
    expect(await read(10)).toBeNull()
  }
)

it('rejects period data attached to a different period', async () => {
  await expect(
    writeFixturePeriodStatisticsRefresh(10, {
      fixtureId: 10,
      fetchedAt: 1000,
      periods: [
        {
          id: 1,
          fixture_id: 10,
          type_id: 1,
          description: 'First half',
          sort_order: 1,
          statistics: [
            {
              id: 2,
              fixture_id: 10,
              period_id: 3,
              participant_id: 19,
              type_id: 45,
              location: 'home',
              data: { value: 50 }
            }
          ]
        }
      ]
    })
  ).rejects.toThrow(/fixture/i)
})
