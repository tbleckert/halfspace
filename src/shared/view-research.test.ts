import { expect, it } from 'vitest'
import { emptyViewResearchContext, readStoredViewSpec, validateViewSpec } from './views'

const context = {
  competitionId: 8,
  competitionName: 'Premier League',
  seasonId: 12,
  seasonName: '2026/27',
  isCurrent: true
}
const shortlist = {
  id: 'shortlist',
  type: 'market-shortlist',
  competitionId: 8,
  seasonId: 12,
  period: 'next-seven-days',
  outcome: 'all',
  selectedFixtureId: null,
  span: 2
}
const probability = {
  id: 'probability',
  type: 'probability-context',
  fixtureSourceBlockId: 'shortlist',
  market: 'match-result',
  span: 1
}
const spec = { version: 3, title: 'Research', message: '', blocks: [shortlist, probability] }

it('validates both research widgets in every span and rejects invalid source bindings', () => {
  for (const span of [1, 2, 3]) {
    const value = { ...spec, blocks: spec.blocks.map((block) => ({ ...block, span })) }
    expect(validateViewSpec(value, [context])).toEqual(value)
    expect(readStoredViewSpec(value)).toEqual(value)
  }
  expect(() =>
    validateViewSpec(
      { ...spec, blocks: [shortlist, { ...probability, fixtureSourceBlockId: 'missing' }] },
      [context]
    )
  ).toThrow()
  expect(() =>
    validateViewSpec({ ...spec, blocks: [{ ...shortlist, period: 'all-history' }] }, [context])
  ).toThrow()
})

it('requires the selected fixture to be known in the exact competition and season', () => {
  const value = { ...spec, blocks: [{ ...shortlist, selectedFixtureId: 10 }, probability] }
  expect(() => validateViewSpec(value, [context])).toThrow(/fixture/i)
  const research = {
    ...emptyViewResearchContext,
    fixtures: [{ fixtureId: 10, competitionId: 8, seasonId: 12, name: 'Arsenal vs Chelsea' }]
  }
  expect(validateViewSpec(value, [context], [], [], research)).toEqual(value)
  expect(() =>
    validateViewSpec(value, [context], [], [], {
      ...research,
      fixtures: [{ ...research.fixtures[0], seasonId: 11 }]
    })
  ).toThrow(/fixture/i)
})

it('upgrades saved v2 next-match links only at the storage boundary', () => {
  const previous = {
    version: 2,
    title: 'My team',
    message: '',
    blocks: [
      { id: 'next', type: 'team-next-match', teamId: 19, span: 2 },
      { id: 'weather', type: 'fixture-weather', nextMatchBlockId: 'next', span: 1 }
    ]
  }
  expect(readStoredViewSpec(previous)).toEqual({
    ...previous,
    version: 3,
    blocks: [
      previous.blocks[0],
      { id: 'weather', type: 'fixture-weather', fixtureSourceBlockId: 'next', span: 1 }
    ]
  })
  expect(() =>
    validateViewSpec(previous, [context], [{ teamId: 19, teamName: 'Arsenal' }])
  ).toThrow()
  expect(() => readStoredViewSpec({ ...previous, blocks: [previous.blocks[1]] })).toThrow()
})
