import { describe, expect, it, vi } from 'vitest'
import type { SportmonksCompetition, SportmonksFixture } from '@shared/contracts'
import {
  fetchCompetitions,
  fetchCompetitionFixtures,
  fetchFixturesByDate,
  fetchStandingsBySeason,
  fetchTeamById,
  fetchTeamFixtures,
  validateCompetitionFixturesInput,
  validateRefreshInput,
  validateStandingsInput,
  validateTeamFixturesInput,
  validateTeamInput,
  validateToken
} from './sportmonks'

describe('Sportmonks client', () => {
  it('paginates with a header token and returns one combined refresh', async () => {
    const fixture = makeFixture()
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(input.toString())
      const page = Number(url.searchParams.get('page'))

      return Response.json({
        data: page === 1 ? [fixture] : [{ ...fixture, id: 2 }],
        pagination: {
          current_page: page,
          has_more: page === 1
        },
        rate_limit: {
          remaining: 2_998,
          resets_in_seconds: 3_600
        },
        timezone: 'Europe/Stockholm'
      })
    })

    const refresh = await fetchFixturesByDate(
      { date: '2026-08-27', timeZone: 'Europe/Stockholm' },
      'private-token',
      fetcher
    )

    expect(refresh.fixtures).toHaveLength(2)
    expect(refresh.pageCount).toBe(2)
    expect(fetcher).toHaveBeenCalledTimes(2)

    const [firstInput, firstInit] = fetcher.mock.calls[0]
    const firstUrl = new URL(firstInput.toString())
    expect(firstUrl.searchParams.has('api_token')).toBe(false)
    expect(new Headers(firstInit?.headers).get('Authorization')).toBe('private-token')
  })

  it('fetches every competition available to the subscription', async () => {
    const competition = makeCompetition()
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(input.toString())
      const page = Number(url.searchParams.get('page'))

      return Response.json({
        data:
          page === 1
            ? [
                {
                  ...competition,
                  currentseason: undefined,
                  currentSeason: competition.currentseason,
                  active: 0
                }
              ]
            : [{ ...competition, id: 9, name: 'Championship', active: 1 }],
        pagination: {
          current_page: page,
          has_more: page === 1
        },
        rate_limit: {
          remaining: 2_997,
          resets_in_seconds: 3_600
        }
      })
    })

    const refresh = await fetchCompetitions('private-token', fetcher)

    expect(refresh.competitions.map(({ id }) => id)).toEqual([8, 9])
    expect(refresh.competitions.map(({ active }) => active)).toEqual([false, true])
    expect(refresh.competitions[0].currentseason?.id).toBe(23614)
    expect(refresh.pageCount).toBe(2)
    expect(refresh.rateLimit?.remaining).toBe(2_997)
    expect(fetcher).toHaveBeenCalledTimes(2)

    const [firstInput, firstInit] = fetcher.mock.calls[0]
    const firstUrl = new URL(firstInput.toString())
    expect(firstUrl.pathname).toBe('/v3/football/leagues')
    expect(firstUrl.searchParams.get('include')).toBe('country;currentSeason')
    expect(firstUrl.searchParams.get('per_page')).toBe('50')
    expect(firstUrl.searchParams.get('page')).toBe('1')
    expect(firstUrl.searchParams.has('api_token')).toBe(false)
    expect(new Headers(firstInit?.headers).get('Authorization')).toBe('private-token')
  })

  it('rejects an unexpected competition response', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [{ id: 8, name: 'Premier League' }],
        pagination: { current_page: 1, has_more: false }
      })
    )

    await expect(fetchCompetitions('private-token', fetcher)).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'Sportmonks returned an unexpected response.'
    })
  })

  it('fetches the current standings with participants and grouping context', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [
          {
            id: 1,
            participant_id: 10,
            league_id: 8,
            season_id: 23614,
            stage_id: 77471288,
            group_id: null,
            round_id: 339273,
            standing_rule_id: null,
            position: 1,
            result: null,
            points: 84,
            participant: { id: 10, name: 'Home' },
            stage: { id: 77471288, name: 'Regular Season' }
          }
        ],
        rate_limit: { remaining: 2_996, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchStandingsBySeason({ seasonId: 23614 }, 'private-token', fetcher)

    expect(refresh.standings).toHaveLength(1)
    expect(refresh.standings[0].participant?.name).toBe('Home')

    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/standings/seasons/23614')
    expect(url.searchParams.get('include')).toBe('participant;stage;group')
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
  })

  it('paginates a league-filtered fixture window', async () => {
    const fixture = makeFixture()
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(input.toString())
      const page = Number(url.searchParams.get('page'))

      return Response.json({
        data: page === 1 ? [fixture] : [{ ...fixture, id: 2 }],
        pagination: { current_page: page, has_more: page === 1 },
        timezone: 'Europe/Stockholm'
      })
    })

    const refresh = await fetchCompetitionFixtures(
      {
        competitionId: 8,
        startDate: '2026-08-14',
        endDate: '2026-09-11',
        timeZone: 'Europe/Stockholm'
      },
      'private-token',
      fetcher
    )

    expect(refresh.fixtures).toHaveLength(2)
    expect(refresh.pageCount).toBe(2)

    const firstUrl = new URL(fetcher.mock.calls[0][0].toString())
    expect(firstUrl.pathname).toBe('/v3/football/fixtures/between/2026-08-14/2026-09-11')
    expect(firstUrl.searchParams.get('filters')).toBe('fixtureLeagues:8')
    expect(firstUrl.searchParams.get('include')).toBe('participants;league;state;scores')
    expect(firstUrl.searchParams.get('timezone')).toBe('Europe/Stockholm')
  })

  it('fetches a team entity with country and venue context', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: {
          id: 9,
          sport_id: 1,
          country_id: 462,
          venue_id: 206,
          gender: 'male',
          name: 'Manchester City',
          short_code: 'MCI',
          image_path: 'https://cdn.sportmonks.com/images/soccer/teams/9/9.png',
          founded: 1880,
          type: 'domestic',
          placeholder: false,
          last_played_at: '2026-08-23 15:00:00',
          country: { id: 462, name: 'England', iso2: 'GB' },
          venue: { id: 206, name: 'Etihad Stadium', capacity: 55097 }
        },
        rate_limit: { remaining: 2_995, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchTeamById({ teamId: 9 }, 'private-token', fetcher)

    expect(refresh.team.name).toBe('Manchester City')
    expect(refresh.team.venue?.name).toBe('Etihad Stadium')

    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/teams/9')
    expect(url.searchParams.get('include')).toBe('country;venue')
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
  })

  it('fetches a team fixture window across competitions', async () => {
    const fixture = makeFixture()
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [fixture],
        pagination: { current_page: 1, has_more: false },
        timezone: 'Europe/Stockholm'
      })
    )

    const refresh = await fetchTeamFixtures(
      {
        teamId: 9,
        startDate: '2026-08-14',
        endDate: '2026-09-11',
        timeZone: 'Europe/Stockholm'
      },
      'private-token',
      fetcher
    )

    expect(refresh.fixtures).toEqual([fixture])
    const url = new URL(fetcher.mock.calls[0][0].toString())
    expect(url.pathname).toBe('/v3/football/fixtures/between/2026-08-14/2026-09-11/9')
    expect(url.searchParams.has('filters')).toBe(false)
  })

  it('maps authentication failures without leaking the token', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 401 }))

    await expect(
      fetchFixturesByDate(
        { date: '2026-08-27', timeZone: 'Europe/Stockholm' },
        'private-token',
        fetcher
      )
    ).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'Sportmonks rejected this token.'
    })
  })

  it('validates dates, time zones, and tokens at the main-process boundary', () => {
    expect(() => validateRefreshInput({ date: '2026-02-30', timeZone: 'UTC' })).toThrow(
      'Choose a valid date.'
    )
    expect(() => validateRefreshInput({ date: '2026-08-27', timeZone: 'Not/AZone' })).toThrow(
      'The selected time zone is not valid.'
    )
    expect(() => validateToken('token with spaces')).toThrow('Enter a valid Sportmonks token.')
    expect(() => validateStandingsInput({ seasonId: -1 })).toThrow('Choose a valid current season.')
    expect(() => validateTeamInput({ teamId: 0 })).toThrow('Choose a valid team.')
    expect(() =>
      validateTeamFixturesInput({
        teamId: 9,
        startDate: '2026-02-30',
        endDate: '2026-03-01',
        timeZone: 'UTC'
      })
    ).toThrow('Choose a valid fixture range.')
    expect(() =>
      validateCompetitionFixturesInput({
        competitionId: 8,
        startDate: '2026-09-01',
        endDate: '2026-08-01',
        timeZone: 'UTC'
      })
    ).toThrow('Choose a valid fixture range.')
    expect(() =>
      validateCompetitionFixturesInput({
        competitionId: 8,
        startDate: '2026-01-01',
        endDate: '2026-05-01',
        timeZone: 'UTC'
      })
    ).toThrow('Fixture ranges cannot exceed 100 days.')
  })
})

function makeCompetition(): SportmonksCompetition {
  return {
    id: 8,
    country_id: 462,
    name: 'Premier League',
    active: true,
    short_code: 'UK PL',
    image_path: 'https://cdn.sportmonks.com/images/soccer/leagues/8/8.png',
    type: 'league',
    sub_type: 'domestic',
    country: {
      id: 462,
      name: 'England',
      iso2: 'GB'
    },
    currentseason: {
      id: 23614,
      league_id: 8,
      name: '2026/2027',
      is_current: true,
      starting_at: '2026-08-01',
      ending_at: '2027-05-31'
    }
  }
}

function makeFixture(): SportmonksFixture {
  return {
    id: 1,
    league_id: 8,
    season_id: 23614,
    state_id: 1,
    name: 'Away vs Home',
    starting_at_timestamp: 1_787_848_400,
    placeholder: false,
    has_odds: true,
    participants: [
      { id: 20, name: 'Away', meta: { location: 'away' } },
      { id: 10, name: 'Home', meta: { location: 'home' } }
    ],
    scores: []
  }
}
