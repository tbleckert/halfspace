import { afterAll, beforeEach, expect, it } from 'vitest'
import type { SportmonksTransfer } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  readTransferFeed,
  writeTransferFeedRefresh,
  writePlayerTransfersRefresh
} from './db'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())
const transfer: SportmonksTransfer = {
  id: 1,
  sport_id: 1,
  player_id: 2,
  type_id: 219,
  from_team_id: 3,
  to_team_id: 4,
  position_id: null,
  detailed_position_id: null,
  date: '2026-08-31',
  career_ended: false,
  completed: false,
  amount: null
}

it('isolates pages and date windows without claiming an incomplete feed is complete', async () => {
  await writeTransferFeedRefresh(
    { feed: 'latest', page: 1 },
    { transfers: [transfer], page: 1, hasMore: true, fetchedAt: 1000 }
  )
  await writeTransferFeedRefresh(
    { feed: 'latest', page: 2 },
    { transfers: [], page: 2, hasMore: false, fetchedAt: 1000 }
  )
  expect(await readTransferFeed({ feed: 'latest', page: 1 })).toMatchObject({
    query: { hasMore: true },
    transfers: [{ id: 1 }]
  })
  expect(await readTransferFeed({ feed: 'latest', page: 2 })).toMatchObject({
    query: { hasMore: false },
    transfers: []
  })
  expect(
    (
      await readTransferFeed({
        feed: 'dates',
        page: 1,
        startDate: '2026-08-01',
        endDate: '2026-08-31'
      })
    ).query
  ).toBeNull()
  await clearSportmonksCache()
  expect((await readTransferFeed({ feed: 'latest', page: 1 })).query).toBeNull()
})

it('preserves newer shared transfer data when an older player history arrives', async () => {
  await writeTransferFeedRefresh(
    { feed: 'latest', page: 1 },
    { transfers: [{ ...transfer, completed: true }], page: 1, hasMore: false, fetchedAt: 2000 }
  )
  await writePlayerTransfersRefresh(
    { playerId: 2 },
    { transfers: [transfer], pageCount: 1, fetchedAt: 1000 }
  )
  expect((await readTransferFeed({ feed: 'latest', page: 1 })).transfers[0].raw.completed).toBe(
    true
  )
})
