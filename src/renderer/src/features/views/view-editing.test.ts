import { expect, it } from 'vitest'
import { createStarterView } from './starter-views'
import { addViewBlock, moveViewBlock, removeViewBlock } from './view-editing'

const context = {
  competitionId: 8,
  competitionName: 'Premier League',
  seasonId: 12,
  seasonName: '2026/27',
  isCurrent: true
}
const initial = createStarterView('leaders', context)

it('adds blocks with their selected context and unique identities without mutating the draft', () => {
  const next = addViewBlock(initial, 'standings', context)
  expect(initial.blocks).toHaveLength(2)
  expect(next.blocks).toHaveLength(3)
  expect(next.blocks[2]).toMatchObject({ type: 'standings', competitionId: 8, seasonId: 12 })
  expect(new Set(next.blocks.map((block) => block.id)).size).toBe(3)
})

it('enforces eight blocks and retains at least one block', () => {
  let spec = initial
  while (spec.blocks.length < 8) spec = addViewBlock(spec, 'standings', context)
  expect(addViewBlock(spec, 'standings', context)).toBe(spec)
  const single = removeViewBlock(initial, initial.blocks[0].id)
  expect(removeViewBlock(single, single.blocks[0].id)).toBe(single)
})

it('reorders and removes the requested identity while preserving context and other blocks', () => {
  const moved = moveViewBlock(initial, 'assists', -1)
  expect(moved.blocks.map((block) => block.id)).toEqual(['assists', 'goals'])
  expect(moveViewBlock(moved, 'assists', -1)).toBe(moved)
  expect(removeViewBlock(moved, 'assists').blocks).toEqual([initial.blocks[0]])
})
