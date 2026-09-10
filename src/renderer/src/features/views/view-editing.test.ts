import { expect, it } from 'vitest'
import { createStarterView } from './starter-views'
import { addViewBlock, changeViewContext, moveViewBlock, removeViewBlock } from './view-editing'

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

it('changes every block to a verified competition and season without altering layout or metrics', () => {
  const nextContext = { ...context, competitionId: 384, competitionName: 'Serie A', seasonId: 22 }
  const next = changeViewContext({ ...initial, message: 'Old competition summary' }, nextContext, [
    context,
    nextContext
  ])
  expect(next.title).toBe('Serie A · 2026/27')
  expect(next.message).toBe('')
  expect(next.blocks).toEqual(
    initial.blocks.map((block) => ({ ...block, competitionId: 384, seasonId: 22 }))
  )
  expect(initial.blocks[0].seasonId).toBe(12)
  expect(() => changeViewContext(initial, nextContext, [context])).toThrow()
})

it('preserves a personal title and allows switching to an explicit historical season', () => {
  const historical = { ...context, seasonId: 11, seasonName: '2025/26', isCurrent: false }
  const next = changeViewContext({ ...initial, title: 'My investigation' }, historical, [
    context,
    historical
  ])
  expect(next.title).toBe('My investigation')
  expect(next.blocks.every((block) => block.seasonId === 11)).toBe(true)
})
