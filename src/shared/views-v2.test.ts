import { expect, it } from 'vitest'
import { readStoredViewSpec, validateViewSpec, viewBlockSchema } from './views'
import { implementedViewWidgets, viewWidgets } from './view-widgets'

const competition = {
  competitionId: 8,
  competitionName: 'Premier League',
  seasonId: 12,
  seasonName: '2026/27',
  isCurrent: true
}
const teams = [{ teamId: 19, teamName: 'Arsenal' }]

it('accepts every supported column mode and refuses unknown teams and planned widgets', () => {
  for (const span of [1, 2, 3]) {
    const spec = {
      version: 3,
      title: 'My Arsenal',
      message: '',
      blocks: [{ id: 'next', type: 'team-next-match', teamId: 19, span }]
    }
    expect(validateViewSpec(spec, [], teams)).toEqual(spec)
    expect(() => validateViewSpec(spec, [], [])).toThrow(/team/i)
  }
  expect(
    viewBlockSchema.safeParse({ id: 'next', type: 'team-next-match', teamId: 19, span: 4 }).success
  ).toBe(false)
  for (const widget of viewWidgets.filter((item) => item.status !== 'implemented')) {
    expect(
      viewBlockSchema.safeParse({ id: 'planned', type: widget.type, teamId: 19, span: 1 }).success
    ).toBe(false)
  }
  expect(implementedViewWidgets.every((widget) => widget.columns.join() === '1,2,3')).toBe(true)
})

it('validates the team and competition-season identities independently', () => {
  const spec = {
    version: 3,
    title: 'Season',
    message: '',
    blocks: [
      { id: 'season', type: 'team-season', teamId: 19, competitionId: 8, seasonId: 12, span: 1 }
    ]
  }
  expect(validateViewSpec(spec, [competition], teams)).toEqual(spec)
  expect(() => validateViewSpec(spec, [{ ...competition, seasonId: 13 }], teams)).toThrow(/season/i)
  expect(() =>
    validateViewSpec(spec, [competition], [{ teamId: 20, teamName: 'Chelsea' }])
  ).toThrow(/team/i)
})

it('accepts a team form sample in every width while rejecting unknown bindings and unsupported scopes', () => {
  for (const span of [1, 2, 3]) {
    const spec = {
      version: 3,
      title: 'Form',
      message: '',
      blocks: [{ id: 'trend', type: 'form-trend', teamId: 19, span, matchLocation: 'home' }]
    }
    expect(validateViewSpec(spec, [], teams)).toEqual(spec)
    expect(() => validateViewSpec(spec, [], [])).toThrow(/team/i)
    expect(viewBlockSchema.safeParse({ ...spec.blocks[0], matchLocation: 'neutral' }).success).toBe(
      false
    )
    expect(viewBlockSchema.safeParse({ ...spec.blocks[0], seasonId: 12 }).success).toBe(false)
  }
})

it('opens saved version-one layouts while retaining identities and explicit full widths', () => {
  const original = {
    version: 1,
    title: 'Saved league',
    message: '',
    blocks: [
      { id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'half' },
      {
        id: 'games',
        type: 'fixtures',
        competitionId: 8,
        seasonId: 12,
        span: 'full',
        period: 'upcoming'
      }
    ]
  }
  expect(readStoredViewSpec(original)).toMatchObject({
    version: 3,
    blocks: [
      { id: 'table', span: 1, teamId: null },
      { id: 'games', span: 3 }
    ]
  })
  expect(original.version).toBe(1)
  expect(() => readStoredViewSpec({ ...original, version: 99 })).toThrow()
})
