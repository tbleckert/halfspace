import { expect, it, vi } from 'vitest'
import {
  fetchSeasonReferees,
  fetchSeasonVenues,
  fetchStandingCorrections
} from './season-resources'
import { fetchTeamSchedule, validateTeamScheduleInput } from './sportmonks'

it('fetches every referee page and rejects missing or mismatched pagination', async () => {
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const page = Number(new URL(String(input)).searchParams.get('page'))
    return Response.json({
      data: [{ id: page, name: 'Official', display_name: 'Official', country_id: null }],
      pagination: { current_page: page, has_more: page === 1 }
    })
  })
  const result = await fetchSeasonReferees({ seasonId: 12 }, 'token', fetcher)
  expect(result.referees.map(({ id }) => id)).toEqual([1, 2])
  expect(new URL(String(fetcher.mock.calls[0][0])).pathname).toBe(
    '/v3/football/referees/seasons/12'
  )
  for (const pagination of [undefined, { current_page: 2, has_more: false }]) {
    await expect(
      fetchSeasonReferees({ seasonId: 12 }, 'token', async () =>
        Response.json({ data: [], pagination })
      )
    ).rejects.toMatchObject({ code: 'invalid_response' })
  }
})

it('reads the unpaginated venue list including unknown capacity', async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ data: [{ id: 3, name: 'Ground', capacity: null }] })
  )
  const result = await fetchSeasonVenues({ seasonId: 12 }, 'token', fetcher)
  expect(result.venues[0].capacity).toBeNull()
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.pathname).toBe('/v3/football/venues/seasons/12')
  expect(url.searchParams.get('include')).toBe('country')
  expect(url.searchParams.has('page')).toBe(false)
})

it('preserves correction signs and inactive entries and rejects another season', async () => {
  const correction = {
    id: 1,
    season_id: 12,
    stage_id: 2,
    group_id: null,
    type_id: 173,
    value: 3,
    calc_type: '-',
    participant_type: 'team',
    participant_id: 4,
    active: false
  }
  const result = await fetchStandingCorrections({ seasonId: 12 }, 'token', async () =>
    Response.json({ data: [correction] })
  )
  expect(result.corrections[0]).toMatchObject({ value: 3, calc_type: '-', active: false })
  await expect(
    fetchStandingCorrections({ seasonId: 13 }, 'token', async () =>
      Response.json({ data: [correction] })
    )
  ).rejects.toMatchObject({ code: 'invalid_response' })
})

it('loads a team schedule including aggregate legs and rejects another team or season', async () => {
  const fixture = {
    id: 10,
    league_id: 8,
    season_id: 12,
    state_id: 1,
    placeholder: false,
    has_odds: false,
    participants: [{ id: 4, name: 'Club' }]
  }
  const stage = {
    id: 2,
    season_id: 12,
    name: 'Final',
    sort_order: 1,
    finished: false,
    is_current: true,
    aggregates: [{ fixtures: [fixture] }]
  }
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: [stage] }))
  const result = await fetchTeamSchedule({ seasonId: 12, teamId: 4 }, 'token', fetcher)
  expect(result.stages[0].fixtures[0].id).toBe(10)
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.pathname).toBe('/v3/football/schedules/seasons/12/teams/4')
  expect(url.search).toBe('')
  for (const input of [
    { seasonId: 13, teamId: 4 },
    { seasonId: 12, teamId: 5 }
  ]) {
    await expect(fetchTeamSchedule(input, 'token', fetcher)).rejects.toMatchObject({
      code: 'invalid_response'
    })
  }
  expect(() => validateTeamScheduleInput({ seasonId: 12, teamId: 0 })).toThrow()
})
