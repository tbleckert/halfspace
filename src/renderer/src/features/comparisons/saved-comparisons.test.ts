import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db } from '@/data/db'
import { saveComparison } from './saved-comparisons'

const selection = {
  kind: 'teams' as const,
  left: 19,
  right: 8,
  leftSeason: 12,
  rightSeason: 11,
  leftScope: 'home' as const,
  rightScope: 'away' as const
}

beforeEach(() => db.savedComparisons.clear())
afterAll(() => db.close())

it('retains the exact comparison after football caches are cleared', async () => {
  const saved = await saveComparison(' Home and away ', selection)
  await clearSportmonksCache()
  expect(await db.savedComparisons.get(saved.id)).toMatchObject({
    name: 'Home and away',
    version: 1,
    selection
  })
})

it('stores one explicit club per player, including the same player in different seasons', async () => {
  const players = {
    kind: 'players' as const,
    left: 100,
    right: 100,
    leftSeason: 12,
    rightSeason: 11,
    leftTeam: 19,
    rightTeam: 8
  }
  const saved = await saveComparison('Across clubs', players)
  expect((await db.savedComparisons.get(saved.id))?.selection).toEqual(players)
})

it('rejects incomplete selections and blank names without storing them', async () => {
  await expect(saveComparison(' ', selection)).rejects.toThrow()
  await expect(
    saveComparison('Incomplete', { ...selection, leftSeason: undefined } as never)
  ).rejects.toThrow()
  await expect(
    saveComparison('Missing club', { ...selection, kind: 'players' } as never)
  ).rejects.toThrow()
  expect(await db.savedComparisons.count()).toBe(0)
})
