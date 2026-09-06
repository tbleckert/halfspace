import { beforeEach, expect, it, vi } from 'vitest'
import {
  fetchSeasonStatistics,
  fetchSeasonTopscorers,
  validateSeasonStatisticsInput
} from './sportmonks'
import { clearSportmonksRateLimits } from './sportmonks-client'
import { makeTopscorer } from '../test/topscorer-fixtures'

beforeEach(clearSportmonksRateLimits)

it.each([{ stageId: 77482558 }, { stageId: 77482558, roundId: 407872 }])(
  'fetches complete scoped statistics with real provider value shapes: %j',
  async (scope) => {
    const id = 'roundId' in scope ? scope.roundId : scope.stageId
    const fetcher = vi.fn<typeof fetch>(async (input, options) => {
      const url = new URL(input.toString())
      const kind = 'roundId' in scope ? 'round' : 'stage'
      expect(url.pathname).toBe(`/v3/football/statistics/${kind}s/${id}`)
      expect(url.searchParams.get('filters')).toBe(
        `${kind}StatisticTypes:188,189,190,191,192,193,194`
      )
      expect(options?.headers).toMatchObject({ Authorization: 'token' })
      expect(url.searchParams.has('api_token')).toBe(false)
      const page = Number(url.searchParams.get('page'))
      return Response.json({
        data: [
          {
            id: page,
            model_id: id,
            type_id: page === 1 ? 188 : 191,
            relation_id: null,
            value:
              page === 1
                ? { total: 10, played: 10, percentage: 100 }
                : { total: 23, average: 2.3, home: { count: 11 }, away: { count: 12 } }
          }
        ],
        pagination: { current_page: page, has_more: page === 1 }
      })
    })
    const result = await fetchSeasonStatistics({ seasonId: 28083, ...scope }, 'token', fetcher)
    expect(result).toMatchObject(scope)
    expect(result.statistics).toHaveLength(2)
    expect(result.statistics[1].value).toMatchObject({ total: 23, home: { count: 11 } })
  }
)

it('rejects another scope and never returns partial statistics', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ data: [{ id: 1, model_id: 999, type_id: 188, value: 2 }] })
    )
  await expect(
    fetchSeasonStatistics({ seasonId: 28083, stageId: 77482558 }, 'token', fetcher)
  ).rejects.toMatchObject({ code: 'invalid_response' })
  fetcher
    .mockResolvedValueOnce(
      Response.json({ data: [], pagination: { current_page: 1, has_more: true } })
    )
    .mockResolvedValueOnce(Response.json({ message: 'Denied' }, { status: 403 }))
  await expect(
    fetchSeasonStatistics({ seasonId: 28083, stageId: 77482558 }, 'token', fetcher)
  ).rejects.toThrow()
})

it('fetches all stage leader pages without requiring a provider season_id', async () => {
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/topscorers/stages/77482558')
    expect(url.searchParams.get('include')).toBe('player;participant;type')
    expect(url.searchParams.get('filters')).toBe('stageTopscorerTypes:208,209,84,83')
    const page = Number(url.searchParams.get('page'))
    return Response.json({
      data: [
        {
          ...makeTopscorer({ id: page, position: page, total: page }),
          season_id: undefined,
          stage_id: 77482558
        }
      ],
      pagination: { current_page: page, has_more: page === 1 }
    })
  })
  const result = await fetchSeasonTopscorers(
    { seasonId: 28083, stageId: 77482558 },
    'token',
    fetcher
  )
  expect(result.pageCount).toBe(2)
  expect(result.stageId).toBe(77482558)
  expect(
    result.topscorers.map(({ season_id, position, total }) => ({ season_id, position, total }))
  ).toEqual([
    { season_id: 28083, position: 1, total: 1 },
    { season_id: 28083, position: 2, total: 2 }
  ])
})

it('rejects leaders for a different stage and later-page failures', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ data: [{ ...makeTopscorer(), stage_id: 123 }] }))
  const input = { seasonId: 28083, stageId: 77482558 }
  await expect(fetchSeasonTopscorers(input, 'token', fetcher)).rejects.toMatchObject({
    code: 'invalid_response'
  })
  fetcher
    .mockResolvedValueOnce(
      Response.json({
        data: [{ ...makeTopscorer(), stage_id: input.stageId }],
        pagination: { current_page: 1, has_more: true }
      })
    )
    .mockResolvedValueOnce(Response.json({ message: 'Denied' }, { status: 403 }))
  await expect(fetchSeasonTopscorers(input, 'token', fetcher)).rejects.toThrow()
})

it('rejects invalid scope IDs and rounds without a stage', () => {
  for (const input of [
    { seasonId: 1, roundId: 4 },
    { seasonId: 1, stageId: -1 },
    { seasonId: 1, stageId: 2, roundId: '3' }
  ]) {
    expect(() => validateSeasonStatisticsInput(input)).toThrow()
  }
})
