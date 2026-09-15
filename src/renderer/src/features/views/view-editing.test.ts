import { expect, it } from 'vitest'
import { createStarterView } from './starter-views'
import { implementedViewWidgets } from '@shared/view-widgets'
import { validateViewSpec } from '@shared/views'
import { addViewBlock, moveViewBlock, removeViewBlock } from './view-editing'

const context = {
  competitionId: 8,
  competitionName: 'Premier League',
  seasonId: 12,
  seasonName: '2026/27',
  isCurrent: true
}
const initial = createStarterView('leaders', context)

it.each(implementedViewWidgets)(
  'creates a valid $type widget in all three column modes',
  (widget) => {
    const team = { teamId: 19, teamName: 'Arsenal' }
    const left = {
      ...context,
      kind: widget.type === 'team-comparison' ? ('teams' as const) : ('players' as const),
      entityId: widget.type === 'team-comparison' ? 19 : 100,
      entityName: 'Selected entity',
      teamId: 19,
      teamName: 'Arsenal'
    }
    const right = {
      ...left,
      entityId: widget.type === 'team-comparison' ? 20 : 101,
      teamId: widget.type === 'team-comparison' ? 20 : 19
    }
    const next = addViewBlock(
      {
        ...initial,
        blocks:
          widget.context === 'match-source'
            ? [{ id: 'next', type: 'team-next-match', teamId: 19, span: 2 }]
            : []
      },
      widget.type,
      context,
      team,
      { left, right }
    )
    for (const span of widget.columns) {
      const spec = { ...next, blocks: next.blocks.map((block) => ({ ...block, span })) }
      expect(
        validateViewSpec(spec, [context], [team], [], {
          fixtures: [],
          statistics: [left, right],
          markets: [],
          bookmakers: []
        })
      ).toEqual(spec)
    }
  }
)

it('adds blocks with their selected context and unique identities without mutating the draft', () => {
  const next = addViewBlock(initial, 'standings', context)
  expect(initial.blocks).toHaveLength(2)
  expect(next.blocks).toHaveLength(3)
  expect(next.blocks[2]).toMatchObject({
    type: 'standings',
    teamId: null,
    competitionId: 8,
    seasonId: 12
  })
  expect(new Set(next.blocks.map((block) => block.id)).size).toBe(3)
})

it('adds beyond eight blocks and retains at least one block', () => {
  let spec = initial
  for (let index = 0; index < 22; index++) spec = addViewBlock(spec, 'standings', context)
  expect(spec.blocks).toHaveLength(24)
  expect(validateViewSpec(spec, [context])).toEqual(spec)
  const single = removeViewBlock(initial, initial.blocks[0].id)
  expect(removeViewBlock(single, single.blocks[0].id)).toBe(single)
})

it('reorders and removes the requested identity while preserving context and other blocks', () => {
  const moved = moveViewBlock(initial, 'assists', -1)
  expect(moved.blocks.map((block) => block.id)).toEqual(['assists', 'goals'])
  expect(moveViewBlock(moved, 'assists', -1)).toBe(moved)
  expect(removeViewBlock(moved, 'assists').blocks).toEqual([initial.blocks[0]])
})

it('links broadcasts to the selected next match and removes dependents in the same edit', () => {
  const team = { teamId: 19, teamName: 'Arsenal' }
  const first = addViewBlock(initial, 'team-next-match', undefined, team)
  const second = addViewBlock(first, 'team-next-match', undefined, {
    teamId: 20,
    teamName: 'Chelsea'
  })
  const sourceId = second.blocks[3].id
  const spec = addViewBlock(second, 'fixture-broadcasts', undefined, undefined, {
    fixtureSourceBlockId: sourceId
  })
  expect(spec.blocks.at(-1)).toMatchObject({
    fixtureSourceBlockId: sourceId,
    countryId: 'preferred'
  })
  expect(removeViewBlock(spec, sourceId).blocks).toEqual(first.blocks)
  expect(spec.blocks).toHaveLength(5)
  expect(() => addViewBlock(initial, 'fixture-broadcasts')).toThrow('Add a Next match')
  const pair = { ...spec, blocks: spec.blocks.slice(3) }
  expect(removeViewBlock(pair, sourceId)).toBe(pair)
})
