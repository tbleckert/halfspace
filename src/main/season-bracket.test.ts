import { expect, it, vi } from 'vitest'
import { fetchSeasonBracket } from './season-bracket'

const fixture = {
  id: 10,
  league_id: 27,
  season_id: 12,
  stage_id: 1,
  state_id: 5,
  placeholder: false,
  has_odds: false
}
const aggregate = {
  id: 4,
  league_id: 27,
  season_id: 12,
  stage_id: 1,
  name: 'Home vs Away',
  fixture_ids: [10, 11],
  result: '3-2',
  detail: 'After Full Time',
  winner_participant_id: 19
}
const stage = {
  id: 1,
  season_id: 12,
  type_id: 224,
  name: 'Semi-finals',
  sort_order: 1,
  starting_at: '2026-01-01',
  aggregates: [aggregate]
}

it('fetches provider progression and cup aggregates without duplicating the season schedule', async () => {
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).includes('/brackets')
        ? {
            data: {
              stages: [{ stage_id: 1, stage_name: 'Semi-finals', fixtures: [fixture] }],
              edges: [
                {
                  id: 1,
                  season_id: 12,
                  parent_fixture_id: 10,
                  child_fixture_id: 20,
                  child_slot: 'home',
                  parent_outcome: 'winner'
                }
              ]
            }
          }
        : { data: [stage] }
    )
  )
  const result = await fetchSeasonBracket({ seasonId: 12 }, 'private-token', fetcher)
  expect(result.stages[0].fixtures[0].id).toBe(10)
  expect(result.catalog[0].aggregates[0].fixture_ids).toEqual([10, 11])
  expect(result.edges[0].parent_outcome).toBe('winner')
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls.map(([url]) => new URL(url.toString()).pathname)).toEqual([
    '/v3/football/seasons/12/brackets',
    '/v3/football/stages/seasons/12'
  ])
})

it('retains domestic cup stages and aggregates when bracket edges are unavailable', async () => {
  const result = await fetchSeasonBracket({ seasonId: 12 }, 'token', async (url) =>
    Response.json(
      String(url).includes('/brackets') ? { data: { stages: [], edges: [] } } : { data: [stage] }
    )
  )
  expect(result.stages).toEqual([])
  expect(result.edges).toEqual([])
  expect(result.catalog).toHaveLength(1)
})

it('rejects wrong-season fixtures, edges, stages, and aggregates', async () => {
  for (const part of ['fixture', 'edge', 'stage', 'aggregate']) {
    const response = {
      data: {
        stages: [
          {
            stage_id: 1,
            stage_name: 'Semi-finals',
            fixtures: [{ ...fixture, season_id: part === 'fixture' ? 99 : 12 }]
          }
        ],
        edges: [
          {
            id: 1,
            season_id: part === 'edge' ? 99 : 12,
            parent_fixture_id: 10,
            child_fixture_id: 20,
            child_slot: 'home',
            parent_outcome: 'winner'
          }
        ]
      }
    }
    await expect(
      fetchSeasonBracket({ seasonId: 12 }, 'token', async (url) =>
        Response.json(
          String(url).includes('/brackets')
            ? response
            : {
                data: [
                  {
                    ...stage,
                    season_id: part === 'stage' ? 99 : 12,
                    aggregates: [{ ...aggregate, season_id: part === 'aggregate' ? 99 : 12 }]
                  }
                ]
              }
        )
      )
    ).rejects.toThrow(/season|relationship/i)
  }
})

it('does not return a partial stage catalog after pagination fails', async () => {
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url).includes('/brackets')) return Response.json({ data: { stages: [], edges: [] } })
    if (new URL(url.toString()).searchParams.get('page') === '2')
      return new Response('', { status: 503 })
    return Response.json({ data: [stage], pagination: { current_page: 1, has_more: true } })
  })
  await expect(fetchSeasonBracket({ seasonId: 12 }, 'token', fetcher)).rejects.toThrow()
  expect(fetcher).toHaveBeenCalledTimes(3)
})
