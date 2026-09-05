import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db } from '@/data/db'
import { saveView, undoSavedView } from './saved-views'
import type { ViewSpec } from '@shared/views'

const spec: ViewSpec = {
  version: 1,
  title: 'My league',
  message: '',
  blocks: [{ id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'half' }]
}
beforeEach(async () => {
  await db.savedViews.clear()
})
afterAll(() => db.close())

it('preserves saved definitions when Sportmonks data is reset', async () => {
  await saveView('my-view', spec)
  await clearSportmonksCache()
  expect((await db.savedViews.get('my-view'))?.spec).toEqual(spec)
})

it('keeps the previous saved definition for undo and preserves creation time', async () => {
  const original = await saveView('my-view', spec)
  await saveView('my-view', { ...spec, title: 'Updated' })
  expect((await db.savedViews.get('my-view'))?.createdAt).toBe(original.createdAt)
  await undoSavedView('my-view')
  expect((await db.savedViews.get('my-view'))?.spec).toEqual(spec)
})

it('refuses to persist an incomplete definition', async () => {
  await expect(saveView('my-view', { ...spec, blocks: [] })).rejects.toThrow()
  expect(await db.savedViews.count()).toBe(0)
})
