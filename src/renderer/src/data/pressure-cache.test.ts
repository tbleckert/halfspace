import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db, readFixturePressure, writeFixturePressureRefresh } from './db'

beforeEach(async () => {
  await db.open()
  await clearSportmonksCache()
})
afterAll(() => db.close())

it('retains empty pressure queries offline and isolates fixtures', async () => {
  expect(await readFixturePressure(10)).toBeNull()
  await writeFixturePressureRefresh(10, { points: [], fetchedAt: 2000 })
  expect(await readFixturePressure(10)).toMatchObject({
    points: [],
    fetchedAt: 2000,
    staleAt: 3602000
  })
  expect(await readFixturePressure(11)).toBeNull()
  await clearSportmonksCache()
  expect(await readFixturePressure(10)).toBeNull()
})

it('does not replace newer pressure with an older request', async () => {
  await writeFixturePressureRefresh(10, {
    points: [{ id: 1, fixture_id: 10, participant_id: 1, minute: 1, pressure: 20 }],
    fetchedAt: 2000
  })
  await writeFixturePressureRefresh(10, { points: [], fetchedAt: 1000 })
  expect((await readFixturePressure(10))?.points).toHaveLength(1)
})
