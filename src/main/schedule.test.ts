import { describe, expect, it, vi } from 'vitest'
import { fetchSeasonSchedule, validateSeasonScheduleInput } from './sportmonks'

describe('season schedules', () => {
  it('validates the season at the IPC boundary', () => {
    expect(validateSeasonScheduleInput({ seasonId: 12 })).toEqual({ seasonId: 12 })
    expect(() => validateSeasonScheduleInput({ seasonId: -1 })).toThrow('season')
  })

  it('fetches the complete unpaginated schedule without unsupported includes', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [
          {
            id: 1,
            season_id: 12,
            name: 'Regular season',
            sort_order: 1,
            is_current: true,
            finished: false,
            rounds: [
              {
                id: 2,
                name: '1',
                is_current: true,
                finished: false,
                fixtures: [
                  {
                    id: 50,
                    league_id: 8,
                    season_id: 12,
                    state_id: 1,
                    placeholder: false,
                    has_odds: false
                  }
                ]
              }
            ]
          }
        ],
        rate_limit: { remaining: 99, resets_in_seconds: 30 }
      })
    )
    const result = await fetchSeasonSchedule({ seasonId: 12 }, 'private-token', fetcher)
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/schedules/seasons/12')
    expect(url.search).toBe('')
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.stages[0].rounds[0].fixtures[0].id).toBe(50)
    expect(result.rateLimit?.resetsAt).toBe(result.fetchedAt + 30_000)
  })
})
