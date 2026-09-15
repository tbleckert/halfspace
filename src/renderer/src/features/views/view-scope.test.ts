import { expect, it } from 'vitest'
import { validateViewSpec, viewSpecSchema } from '@shared/views'
import { shortlistFixtures } from './market-shortlist-data'
import type { CachedFixture } from '@/data/db'

const block = {
  id: 'matches',
  type: 'market-shortlist' as const,
  span: 2 as const,
  competitionId: null,
  seasonId: null,
  period: 'next-seven-days' as const,
  outcome: 'all' as const,
  selectedFixtureId: null
}
const spec = { version: 3 as const, title: 'Find a match', message: '', blocks: [block] }

it('accepts broad discovery without a competition and rejects half-bound scope', () => {
  expect(validateViewSpec(spec, [])).toEqual(spec)
  expect(
    viewSpecSchema.safeParse({ ...spec, blocks: [{ ...block, competitionId: 8 }] }).success
  ).toBe(false)
  expect(viewSpecSchema.safeParse({ ...spec, blocks: [{ ...block, seasonId: 12 }] }).success).toBe(
    false
  )
})

it('includes available leagues in broad discovery while retaining exact scoped selection', () => {
  const now = Date.parse('2026-09-15T12:00:00Z')
  const fixtures = [
    { id: 1, leagueId: 8, seasonId: 12, stateId: 1, startingAt: now + 3600000 },
    { id: 2, leagueId: 384, seasonId: 22, stateId: 1, startingAt: now + 7200000 },
    { id: 3, leagueId: 8, seasonId: 11, stateId: 5, startingAt: now - 86400000 }
  ] as CachedFixture[]
  const window = { startDate: '2026-09-15', endDate: '2026-09-21', timeZone: 'UTC' }
  expect(shortlistFixtures(fixtures, block, now, window).map((f) => f.id)).toEqual([1, 2])
  expect(
    shortlistFixtures(fixtures, { ...block, competitionId: 8, seasonId: 12 }, now, window).map(
      (f) => f.id
    )
  ).toEqual([1])
})

it('validates a selected match against broad or exact scope without inventing its identity', () => {
  const research = {
    fixtures: [{ fixtureId: 2, competitionId: 384, seasonId: 22, name: 'A match' }],
    statistics: [],
    markets: [],
    bookmakers: []
  }
  const selected = { ...spec, blocks: [{ ...block, selectedFixtureId: 2 }] }
  expect(validateViewSpec(selected, [], [], [], research)).toEqual(selected)
  expect(() => validateViewSpec(selected, [])).toThrow('unavailable fixture')
  expect(() =>
    validateViewSpec(
      { ...selected, blocks: [{ ...selected.blocks[0], competitionId: 8, seasonId: 12 }] },
      [],
      [],
      [],
      research
    )
  ).toThrow('unavailable fixture')
})
