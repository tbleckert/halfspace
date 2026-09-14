import { expect, it } from 'vitest'
import { createStarterView, createTeamStarterView } from './starter-views'
import { implementedViewWidgets } from '@shared/view-widgets'
import { validateViewSpec } from '@shared/views'
import { addViewBlock, changeViewContext, moveViewBlock, removeViewBlock } from './view-editing'

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

it('changes only season-bound widgets while retaining the team, widths and personal title', () => {
  const spec = createTeamStarterView({ teamId: 19, teamName: 'Arsenal' }, context)
  const historical = { ...context, seasonId: 11, seasonName: '2025/26', isCurrent: false }
  const next = changeViewContext(spec, historical, [context, historical])
  expect(next.title).toBe(spec.title)
  expect(next.blocks).toEqual(
    spec.blocks.map((block) => ('seasonId' in block ? { ...block, seasonId: 11 } : block))
  )
})

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
  expect('seasonId' in initial.blocks[0] && initial.blocks[0].seasonId).toBe(12)
  expect(() => changeViewContext(initial, nextContext, [context])).toThrow()
})

it('preserves a personal title and allows switching to an explicit historical season', () => {
  const historical = { ...context, seasonId: 11, seasonName: '2025/26', isCurrent: false }
  const next = changeViewContext({ ...initial, title: 'My investigation' }, historical, [
    context,
    historical
  ])
  expect(next.title).toBe('My investigation')
  expect(next.blocks.every((block) => 'seasonId' in block && block.seasonId === 11)).toBe(true)
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
