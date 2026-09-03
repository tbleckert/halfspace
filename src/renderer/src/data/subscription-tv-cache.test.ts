import { afterAll, beforeEach, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readFixtureTv,
  readSubscription,
  writeFixtureTvRefresh,
  writeSubscriptionRefresh
} from './db'

beforeEach(async () => {
  await db.open()
  await clearSportmonksCache()
})
afterAll(() => db.close())

it('retains the subscription and empty TV guides offline, separately per fixture', async () => {
  expect(await readSubscription()).toBeNull()
  expect(await readFixtureTv(10)).toBeNull()
  await writeSubscriptionRefresh({
    plans: [{ name: 'Starter', category: 'Advanced' }],
    addOns: ['Odds'],
    resources: [],
    enrichments: [],
    fetchedAt: 1000
  })
  await writeFixtureTvRefresh(10, { listings: [], fetchedAt: 2000 })
  expect(await readSubscription()).toMatchObject({ addOns: ['Odds'], staleAt: 3601000 })
  expect(await readFixtureTv(10)).toMatchObject({ listings: [], staleAt: 3602000 })
  expect(await readFixtureTv(11)).toBeNull()
  await clearSportmonksCache()
  expect(await readSubscription()).toBeNull()
  expect(await readFixtureTv(10)).toBeNull()
})
