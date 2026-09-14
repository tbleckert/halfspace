import { expect, it } from 'vitest'
import {
  validateViewSpec,
  readStoredViewSpec,
  type ViewResearchContext,
  type ViewBlock
} from './views'
const context = {
  competitionId: 8,
  competitionName: 'Premier League',
  seasonId: 12,
  seasonName: '2026/27',
  teamId: 19,
  teamName: 'Arsenal'
}
const research: ViewResearchContext = {
  fixtures: [],
  statistics: [
    { ...context, kind: 'players', entityId: 100, entityName: 'First player' },
    { ...context, kind: 'players', entityId: 101, entityName: 'Second player' },
    { ...context, kind: 'teams', entityId: 19, entityName: 'Arsenal' },
    {
      ...context,
      kind: 'teams',
      teamId: 20,
      entityId: 20,
      entityName: 'Chelsea',
      teamName: 'Chelsea'
    }
  ],
  markets: [{ id: 1, name: 'Match winner' }],
  bookmakers: [{ id: 7, name: 'Example' }]
}
const player = { playerId: 100, teamId: 19, competitionId: 8, seasonId: 12 }
const team = { teamId: 19, competitionId: 8, seasonId: 12, matchLocation: 'home' as const }
const next: ViewBlock = { id: 'next', type: 'team-next-match', teamId: 19, span: 2 }
const widgets: ViewBlock[] = [
  { id: 'news', type: 'team-news', teamId: 19, span: 1 },
  { id: 'profile', type: 'player-profile', selection: player, span: 1 },
  {
    id: 'players',
    type: 'player-comparison',
    left: player,
    right: { ...player, playerId: 101 },
    span: 2
  },
  {
    id: 'teams',
    type: 'team-comparison',
    left: team,
    right: { ...team, teamId: 20, matchLocation: 'away' },
    span: 2
  },
  {
    id: 'odds',
    type: 'odds-comparison',
    fixtureSourceBlockId: 'next',
    marketId: 1,
    bookmakerId: 7,
    span: 3
  }
]
const spec = { version: 3, title: 'Investigation', message: '', blocks: [next, ...widgets] }
it.each(widgets)(
  'accepts $type in all three widths and round-trips its exact selections',
  (widget) => {
    for (const span of [1, 2, 3]) {
      const definition = { ...spec, blocks: [next, { ...widget, span }] }
      expect(
        validateViewSpec(definition, [], [{ teamId: 19, teamName: 'Arsenal' }], [], research)
      ).toEqual(definition)
      expect(readStoredViewSpec(definition)).toEqual(definition)
    }
  }
)
it('rejects real players bound to unreported clubs, competitions or seasons', () => {
  for (const invalid of [
    { ...player, playerId: 999 },
    { ...player, teamId: 20 },
    { ...player, seasonId: 99 },
    { ...player, competitionId: 99 }
  ]) {
    expect(() =>
      validateViewSpec(
        { ...spec, blocks: [{ ...widgets[1], selection: invalid }] },
        [],
        [],
        [],
        research
      )
    ).toThrow(/statistics selection/)
  }
})
it('rejects unknown odds selections and removed next-match sources', () => {
  for (const change of [
    { marketId: 99 },
    { bookmakerId: 99 },
    { fixtureSourceBlockId: 'missing' }
  ]) {
    expect(() =>
      validateViewSpec(
        { ...spec, blocks: [next, { ...widgets[4], ...change }] },
        [],
        [{ teamId: 19, teamName: 'Arsenal' }],
        [],
        research
      )
    ).toThrow()
  }
  expect(() => readStoredViewSpec({ ...spec, blocks: [widgets[4]] })).toThrow()
})
