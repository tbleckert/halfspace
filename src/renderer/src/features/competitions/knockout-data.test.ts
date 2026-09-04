import { expect, it } from 'vitest'
import type { CachedFixture, SeasonBracketQuery } from '@/data/db'
import { knockoutRounds, knockoutProgression } from './knockout-data'

function fixture(
  id: number,
  stage: number,
  home: number,
  away: number,
  winner?: number,
  placeholder = false
): CachedFixture {
  return {
    id,
    leagueId: 27,
    seasonId: 12,
    stateId: winner ? 5 : 1,
    startingAt: id * 1000,
    name: `${home} vs ${away}`,
    resultInfo: null,
    placeholder,
    hasOdds: false,
    homeTeamId: home,
    awayTeamId: away,
    fetchedAt: 1,
    staleAt: 1,
    raw: {
      id,
      league_id: 27,
      season_id: 12,
      stage_id: stage,
      state_id: winner ? 5 : 1,
      placeholder,
      has_odds: false,
      scores: [],
      participants: [home, away].map((id, index) => ({
        id,
        name: `Team ${id}`,
        image_path: null,
        placeholder: id === 999,
        meta: {
          location: index ? ('away' as const) : ('home' as const),
          winner: winner === undefined ? null : winner === id
        }
      }))
    }
  }
}
const stages = [
  {
    id: 2,
    season_id: 12,
    type_id: 224,
    name: 'Final',
    sort_order: 1,
    starting_at: '2026-05-01',
    aggregates: []
  },
  {
    id: 1,
    season_id: 12,
    type_id: 224,
    name: 'Semi-finals',
    sort_order: 2,
    starting_at: '2026-04-01',
    aggregates: []
  }
]
const bracket: SeasonBracketQuery & { fixtures: CachedFixture[] } = {
  seasonId: 12,
  catalog: stages,
  stages: [],
  edges: [],
  fixtures: [],
  fetchedAt: 1,
  staleAt: 1
}
const schedule = (
  fixtures: CachedFixture[]
): NonNullable<Awaited<ReturnType<typeof import('@/data/db').readSeasonSchedule>>> => ({
  seasonId: 12,
  fetchedAt: 1,
  staleAt: 1,
  fixtures,
  stages: stages.map((stage) => ({
    ...stage,
    finished: false,
    is_current: false,
    fixtureIds: fixtures.filter((f) => f.raw.stage_id === stage.id).map((f) => f.id),
    rounds: []
  }))
})

it('orders domestic cup rounds by dates rather than an incorrect sort_order', () => {
  const rounds = knockoutRounds(
    schedule([fixture(10, 1, 19, 8, 19), fixture(20, 2, 19, 9)]),
    bracket
  )
  expect(rounds.map((r) => r.name)).toEqual(['Semi-finals', 'Final'])
})

it('groups legs only by explicit aggregate relationships and preserves the aggregate winner', () => {
  const catalog = stages.map((stage) => ({
    ...stage,
    aggregates:
      stage.id === 1
        ? [
            {
              id: 4,
              league_id: 27,
              season_id: 12,
              stage_id: 1,
              name: 'Team 19 vs Team 8',
              fixture_ids: [11, 10],
              result: '3-2',
              detail: 'After Full Time',
              winner_participant_id: 8
            }
          ]
        : []
  }))
  const rounds = knockoutRounds(schedule([fixture(10, 1, 19, 8, 19), fixture(11, 1, 8, 19, 8)]), {
    ...bracket,
    catalog
  })
  expect(rounds[0].ties).toHaveLength(1)
  expect(rounds[0].ties[0].fixtures.map((f) => f.id)).toEqual([10, 11])
  expect(rounds[0].ties[0].winnerId).toBe(8)
  expect(rounds[0].ties[0].aggregate?.result).toBe('3-2')
})

it('connects reported winners to their next known match but never invents an undrawn slot', () => {
  const rounds = knockoutRounds(
    schedule([
      fixture(10, 1, 19, 8, 19),
      fixture(11, 1, 9, 7, 9),
      fixture(20, 2, 19, 9),
      fixture(21, 2, 999, 999, undefined, true)
    ]),
    bracket
  )
  const links = knockoutProgression(rounds, [])
  expect(links.map((link) => [link.parentFixtureId, link.childFixtureId])).toEqual([
    [10, 20],
    [11, 20]
  ])
})

it('preserves explicit winner and loser paths to future placeholders', () => {
  const rounds = knockoutRounds(
    schedule([fixture(10, 1, 19, 8), fixture(20, 2, 999, 999, undefined, true)]),
    bracket
  )
  expect(
    knockoutProgression(rounds, [
      {
        id: 1,
        season_id: 12,
        parent_fixture_id: 10,
        child_fixture_id: 20,
        parent_outcome: 'loser',
        child_slot: 'away'
      }
    ])[0]
  ).toMatchObject({
    parentFixtureId: 10,
    childFixtureId: 20,
    outcome: 'loser',
    slot: 'away',
    source: 'provider'
  })
})

it('does not infer advancement past an unreported intervening round', () => {
  const rounds = knockoutRounds(
    schedule([fixture(10, 1, 19, 8, 19), fixture(20, 2, 19, 9)]),
    bracket
  )
  rounds.splice(1, 0, { id: 3, name: 'Missing round', ties: [] })
  expect(knockoutProgression(rounds, [])).toEqual([])
})
