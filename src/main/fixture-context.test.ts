import { describe, expect, it, vi } from 'vitest'
import { fetchFixtureById, fetchStandingsBySeason } from './sportmonks'

describe('fixture and table context requests', () => {
  it('requests match-specific absences and weather with fixture detail', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: {
          id: 50,
          league_id: 8,
          season_id: 1,
          state_id: 5,
          placeholder: false,
          has_odds: false,
          weatherreport: {
            id: 1,
            fixture_id: 50,
            type: 'actual',
            metric: 'celcius',
            current: { temp: 0, humidity: '80%' }
          },
          sidelined: [
            {
              id: 10,
              fixture_id: 50,
              participant_id: 51,
              player_id: 100,
              type_id: 595,
              type: { id: 595, name: 'Back Injury' }
            }
          ]
        }
      })
    )
    const result = await fetchFixtureById({ fixtureId: 50 }, 'private-token', fetcher)
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    const includes = url.searchParams.get('include')?.split(';')
    expect(includes).toEqual(
      expect.arrayContaining(['weatherReport', 'sidelined.player', 'sidelined.type'])
    )
    expect(result.fixture.weatherreport?.current?.temp).toBe(0)
    expect(result.fixture.sidelined?.[0].participant_id).toBe(51)
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
  })

  it('fetches the provider rule label for each table position', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [] }))
    await fetchStandingsBySeason({ seasonId: 1 }, 'private-token', fetcher)
    const url = new URL(fetcher.mock.calls[0][0].toString())
    expect(url.searchParams.get('include')?.split(';')).toContain('rule.type')
  })
})
