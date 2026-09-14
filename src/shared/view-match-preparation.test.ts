import { expect, it } from 'vitest'
import { readStoredViewSpec, validateViewSpec } from './views'

const contexts = [
  {
    competitionId: 8,
    competitionName: 'Premier League',
    seasonId: 12,
    seasonName: '2026/27',
    isCurrent: true
  }
]
const teams = [{ teamId: 19, teamName: 'Arsenal' }]
const source = { id: 'next', type: 'team-next-match', teamId: 19, span: 2 }
const widgets = [
  { id: 'meetings', type: 'fixture-head-to-head', fixtureSourceBlockId: 'next' },
  { id: 'absences', type: 'fixture-absences', fixtureSourceBlockId: 'next' },
  { id: 'weather', type: 'fixture-weather', fixtureSourceBlockId: 'next' },
  { id: 'squad', type: 'team-squad', teamId: 19, competitionId: 8, seasonId: 12 },
  { id: 'transfers', type: 'team-transfers', teamId: 19, direction: 'all' }
]
const definition = (block: unknown): Record<string, unknown> => ({
  version: 3,
  title: 'Match preparation',
  message: '',
  blocks: [source, block]
})
it.each(widgets)('accepts and stores every span for $type', (widget) => {
  for (const span of [1, 2, 3]) {
    const spec = definition({ ...widget, span })
    expect(validateViewSpec(spec, contexts, teams)).toEqual(spec)
    expect(readStoredViewSpec(spec)).toEqual(spec)
  }
})
it('rejects unsupported identities, references, and transfer scopes', () => {
  for (const widget of widgets.slice(0, 3))
    expect(() =>
      validateViewSpec(
        definition({ ...widget, span: 1, fixtureSourceBlockId: 'missing' }),
        contexts,
        teams
      )
    ).toThrow()
  for (const changed of [{ seasonId: 999 }, { competitionId: 999 }, { teamId: 999 }])
    expect(() =>
      validateViewSpec(definition({ ...widgets[3], ...changed, span: 1 }), contexts, teams)
    ).toThrow()
  expect(() =>
    validateViewSpec(definition({ ...widgets[4], span: 1, direction: 'rumours' }), contexts, teams)
  ).toThrow()
})
