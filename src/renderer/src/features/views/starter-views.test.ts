import { expect, it } from 'vitest'
import { createStarterView, starterViews } from './starter-views'
import { validateViewSpec } from '@shared/views'

const context = {
  competitionId: 8,
  competitionName: 'Premier League',
  seasonId: 12,
  seasonName: '2026/27',
  isCurrent: true
}

it.each(['overview', 'leaders', 'matchday'] as const)(
  'builds a complete %s starter for the exact selected season',
  (template) => {
    const spec = createStarterView(template, context)
    expect(validateViewSpec(spec, [context])).toEqual(spec)
    expect(spec.blocks.length).toBeGreaterThan(1)
    expect(spec.blocks.every((block) => block.competitionId === 8 && block.seasonId === 12)).toBe(
      true
    )
    expect(new Set(spec.blocks.map((block) => block.id)).size).toBe(spec.blocks.length)
  }
)

it('offers distinct useful compositions and bounds long competition titles', () => {
  expect(starterViews).toHaveLength(3)
  expect(
    createStarterView('leaders', context).blocks.map(
      (block) => block.type === 'leaders' && block.category
    )
  ).toEqual(['goals', 'assists'])
  expect(
    createStarterView('matchday', context).blocks.map(
      (block) => block.type === 'fixtures' && block.period
    )
  ).toEqual(['upcoming', 'recent'])
  expect(
    createStarterView('overview', { ...context, competitionName: 'A'.repeat(200) }).title.length
  ).toBeLessThanOrEqual(80)
})
