import Dexie from 'dexie'
import { afterEach, expect, it } from 'vitest'
import { clearSportmonksCache, db } from './db'

afterEach(() => db.delete())

it.each([44, 45])(
  'preserves saved work when opening an existing version %i database',
  async (version) => {
    const stores = Object.fromEntries(
      db.tables
        .filter((table) => version === 45 || !table.name.startsWith('viewText'))
        .map(({ name, schema }) => [
          name,
          [schema.primKey.src, ...schema.indexes.map((index) => index.src)].join(', ')
        ])
    )
    await db.delete()
    const previous = new Dexie(db.name)
    previous.version(version).stores(stores)
    const savedView = { id: 'saved-view', updatedAt: 1, definition: { title: 'My team' } }
    const savedComparison = { id: 'saved-comparison', updatedAt: 1 }
    try {
      await previous.table('savedViews').put(savedView)
      await previous.table('savedComparisons').put(savedComparison)
      if (version === 45) {
        await previous.table('viewTextPrompts').put({ key: 'prompt', prompt: 'Summarize the team' })
        await previous.table('viewTextContents').put({ key: 'content', text: 'Saved summary' })
      }
    } finally {
      previous.close()
    }

    await db.open()
    await clearSportmonksCache()

    expect(await db.table('savedViews').get(savedView.id)).toEqual(savedView)
    expect(await db.savedComparisons.get(savedComparison.id)).toEqual(savedComparison)
    if (version === 45) {
      expect(await db.table('viewTextPrompts').get('prompt')).toEqual({
        key: 'prompt',
        prompt: 'Summarize the team'
      })
      expect(await db.table('viewTextContents').get('content')).toEqual({
        key: 'content',
        text: 'Saved summary'
      })
    }
  }
)
