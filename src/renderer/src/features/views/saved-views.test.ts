import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db } from '@/data/db'
import { duplicateView, readSavedViews, saveView, undoSavedView } from './saved-views'
import type { ViewSpec } from '@shared/views'

const spec: ViewSpec = {
  version: 2,
  title: 'My league',
  message: '',
  blocks: [
    { id: 'table', type: 'standings', teamId: null, competitionId: 8, seasonId: 12, span: 1 }
  ]
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

it('opens and edits a persisted v1 view and restores it through undo in the new format', async () => {
  const legacy = {
    version: 1,
    title: 'Old view',
    message: '',
    blocks: [{ id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'full' }]
  }
  await db.savedViews.put({
    id: 'legacy',
    spec: legacy as unknown as ViewSpec,
    previousSpec: null,
    createdAt: 1,
    updatedAt: 2
  })
  const [opened] = await readSavedViews()
  expect(opened.spec).toMatchObject({
    version: 2,
    blocks: [{ id: 'table', span: 3, teamId: null }]
  })
  await saveView('legacy', { ...opened.spec, title: 'Edited' })
  expect((await db.savedViews.get('legacy'))?.createdAt).toBe(1)
  expect(await undoSavedView('legacy')).toEqual(opened.spec)
  expect((await readSavedViews())[0].spec).toEqual(opened.spec)
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

it('duplicates the current draft into an independent saved view without changing its source', async () => {
  await saveView('original', spec)
  const copy = await duplicateView({
    ...spec,
    title: 'Current draft',
    blocks: [{ ...spec.blocks[0], span: 3 }]
  })
  expect(copy.id).not.toBe('original')
  expect(copy.spec.title).toBe('Current draft copy')
  expect(copy.spec.blocks[0].span).toBe(3)
  expect(copy.previousSpec).toBeNull()
  expect((await db.savedViews.get('original'))?.spec).toEqual(spec)
  await db.savedViews.delete('original')
  await clearSportmonksCache()
  expect((await db.savedViews.get(copy.id))?.spec).toEqual(copy.spec)
})

it('keeps copied names within the saved format and refuses empty drafts', async () => {
  expect((await duplicateView({ ...spec, title: 'A'.repeat(80) })).spec.title).toHaveLength(80)
  await expect(duplicateView({ ...spec, blocks: [] })).rejects.toThrow()
  expect(await db.savedViews.count()).toBe(1)
})
