import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db } from './db'
import { readTransferRumours, writeTransferRumoursRefresh } from './transfer-rumours-cache'

const input = { entity: 'teams' as const, entityId: 1, page: 1 }
const rumour = {
  id: 5,
  player_id: 7,
  from_team_id: 1,
  to_team_id: 2,
  type_id: null,
  date: null,
  amount: null,
  currency: null,
  probability: null,
  source_name: null,
  source_url: null
}
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('keeps rumour pages explicit and separate from completed transfers and ignores late writes', async () => {
  await writeTransferRumoursRefresh(input, {
    ...input,
    rumours: [rumour],
    fetchedAt: 200,
    hasMore: true
  })
  await writeTransferRumoursRefresh(input, {
    ...input,
    rumours: [],
    fetchedAt: 100,
    hasMore: false
  })
  await writeTransferRumoursRefresh(
    { ...input, page: 2 },
    { ...input, page: 2, rumours: [], fetchedAt: 200, hasMore: false }
  )
  expect((await readTransferRumours(input))?.rumours).toHaveLength(1)
  expect((await readTransferRumours(input))?.hasMore).toBe(true)
  expect((await readTransferRumours({ ...input, page: 2 }))?.rumours).toEqual([])
  expect(await db.transfers.count()).toBe(0)
  await expect(
    writeTransferRumoursRefresh(input, {
      ...input,
      page: 2,
      rumours: [],
      fetchedAt: 300,
      hasMore: false
    })
  ).rejects.toThrow(/match/)
  await clearSportmonksCache()
  expect(await readTransferRumours(input)).toBeNull()
  expect(await db.transferRumours.count()).toBe(0)
})
