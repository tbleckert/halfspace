import { describe, expect, it, vi } from 'vitest'
import type { SportmonksCompetition, SportmonksFixture, SportmonksPlayer } from '@shared/contracts'
import {
  fetchCompetitions,
  fetchCompetitionFixtures,
  fetchCompetitionSeasons,
  fetchEntitySearch,
  fetchFixtureById,
  fetchFixtureHeadToHead,
  fetchFixtureOdds,
  fetchFixturesByDate,
  fetchPlayerAppearances,
  fetchPlayerById,
  fetchSeasonStatistics,
  fetchStandingsBySeason,
  fetchTeamById,
  fetchTeamFixtures,
  fetchTeamSquad,
  fetchTeamStatistics,
  fetchVenueById,
  validateCompetitionFixturesInput,
  validateCompetitionSeasonsInput,
  validateEntitySearchInput,
  validateFixtureInput,
  validateFixtureHeadToHeadInput,
  validateRefreshInput,
  validatePlayerAppearancesInput,
  validatePlayerInput,
  validateSeasonStatisticsInput,
  validateStandingsInput,
  validateTeamFixturesInput,
  validateTeamInput,
  validateTeamStatisticsInput,
  validateVenueInput,
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
    expect(firstUrl.searchParams.get('include')).toBe('participants;league;state;scores;periods')
    expect(new Headers(firstInit?.headers).get('Authorization')).toBe('private-token')
  })

  it('fetches a fixture entity with match context and workspace data', async () => {
    const baseFixture = makeFixture()
    const fixture = {
      ...baseFixture,
      stage_id: 77471288,
      round_id: 339273,
      venue_id: 206,
      stage: { id: 77471288, name: 'Regular Season' },
      round: { id: 339273, name: '3' },
      venue: { id: 206, name: 'Etihad Stadium', city_name: 'Manchester' },
      lineups: [
        {
          id: 91,
          fixture_id: baseFixture.id,
          player_id: 6306068,
          team_id: 11,
          position_id: 26,
          type_id: 11,
          player_name: 'Quinten Timber',
          jersey_number: 8
        }
      ],
      events: [
        {
          id: 501,
          fixture_id: baseFixture.id,
          period_id: 1,
          participant_id: 11,
          type_id: 14,
          player_id: 6306068,
          player_name: 'Quinten Timber',
          minute: 18,
          type: { id: 14, name: 'Goal' },
          player: {
            id: 6306068,
            name: 'Quinten Timber',
            display_name: 'Quinten Timber',
            image_path: 'https://cdn.sportmonks.com/images/players/8/6306068.png'
          }
        }
      ],
      statistics: [
        {
          id: 601,
          fixture_id: baseFixture.id,
          type_id: 42,
          participant_id: 11,
          data: { value: 12 },
          location: 'home',
          type: { id: 42, name: 'Shots' }
        }
      ]
    }
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: fixture,
        rate_limit: { remaining: 2_998, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchFixtureById({ fixtureId: fixture.id }, 'private-token', fetcher)

    expect(refresh.fixture.venue?.name).toBe('Etihad Stadium')
    expect(refresh.fixture.lineups?.[0].player_name).toBe('Quinten Timber')
    expect(refresh.fixture.events?.[0].type?.name).toBe('Goal')
    expect(refresh.fixture.events?.[0].player?.image_path).toContain('6306068')
    expect(refresh.fixture.statistics?.[0].data.value).toBe(12)

    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe(`/v3/football/fixtures/${fixture.id}`)
    expect(url.searchParams.get('include')).toBe(
      'participants;league;state;scores;periods;venue;stage;round;lineups;events.type;events.player;events.relatedPlayer;statistics.type'
    )
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
  })

  it('fetches the latest head-to-head fixtures without walking the full history', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [makeFixture()],
        timezone: 'Europe/Stockholm'
      })
    )

    const refresh = await fetchFixtureHeadToHead(
      { firstTeamId: 11, secondTeamId: 22, timeZone: 'Europe/Stockholm' },
      'private-token',
      fetcher
    )

    expect(refresh.fixtures).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(1)

    const [input] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/fixtures/head-to-head/11/22')
    expect(url.searchParams.get('order')).toBe('desc')
    expect(url.searchParams.get('per_page')).toBe('10')
  })

  it('preserves the affected entity and reset time from a rate-limit response', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit of 3000 requests per hour exceeded.',
          retry_after: 1_847,
          rate_limit: {
            remaining: 0,
            total: 3_000,
            resets_in_seconds: 1_847,
            requested_entity: 'Fixture'
          }
        },
        { status: 429 }
      )
    )

    await expect(
      fetchFixtureById({ fixtureId: 19_635_975 }, 'private-token', fetcher)
    ).rejects.toMatchObject({
      code: 'rate_limited',
      rateLimit: {
        estimated: false,
        remaining: 0,
        requestedEntity: 'Fixture',
        resetsAt: expect.any(Number)
      }
    })
  })

  it('provides an honest hourly fallback when a rate-limit response omits reset metadata', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ message: 'Rate limit of 3000 requests per hour exceeded.' }, { status: 429 })
    )

    await expect(
      fetchFixtureById({ fixtureId: 19_635_975 }, 'private-token', fetcher)
    ).rejects.toMatchObject({
      code: 'rate_limited',
      rateLimit: {
        estimated: true,
        remaining: 0,
        resetsAt: expect.any(Number)
      }
    })
  })

  it('uses the standard retry header when a rate-limit body omits reset metadata', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        { message: 'Rate limit of 3000 requests per hour exceeded.' },
        {
          headers: { 'Retry-After': '600', 'X-RateLimit-Remaining': '0' },
          status: 429
        }
      )
    )

    await expect(
      fetchFixtureById({ fixtureId: 19_635_975 }, 'private-token', fetcher)
    ).rejects.toMatchObject({
      code: 'rate_limited',
      rateLimit: {
        estimated: false,
        remaining: 0,
        resetsAt: expect.any(Number)
      }
    })
  })

  it('accepts the non-paginated fixture odds response with bookmaker and market context', async () => {
    const odd = {
      id: 701,
      fixture_id: 19425456,
      market_id: 1,
      bookmaker_id: 2,
      label: 'Home',
      value: '1.80',
      market: { id: 1, name: 'Fulltime Result' },
      bookmaker: { id: 2, name: 'Nordic Bet' }
    }
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [odd],
        rate_limit: { remaining: 1_966, resets_in_seconds: 201 },
        timezone: 'UTC'
      })
    )

    const refresh = await fetchFixtureOdds({ fixtureId: odd.fixture_id }, 'private-token', fetcher)

    expect(refresh.odds).toEqual([odd])
    expect(refresh.rateLimit?.remaining).toBe(1_966)
    const url = new URL(fetcher.mock.calls[0][0].toString())
    expect(url.pathname).toBe('/v3/football/odds/pre-match/fixtures/19425456')
    expect(url.searchParams.get('include')).toBe('bookmaker;market')
    expect(url.searchParams.has('per_page')).toBe(false)
    expect(url.searchParams.has('page')).toBe(false)
    expect(fetcher).toHaveBeenCalledOnce()
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

  it('fetches every season for one competition', async () => {
    const currentSeason = makeCompetition().currentseason!
    const previousSeason = {
      ...currentSeason,
      id: 21646,
      name: '2025/2026',
      is_current: false,
      starting_at: '2025-08-01',
      ending_at: '2026-05-31'
    }
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const page = Number(new URL(input.toString()).searchParams.get('page'))

      return Response.json({
        data: page === 1 ? [currentSeason] : [previousSeason],
        pagination: { current_page: page, has_more: page === 1 },
        rate_limit: { remaining: 2_996, resets_in_seconds: 3_600 }
      })
    })

    const refresh = await fetchCompetitionSeasons({ competitionId: 8 }, 'private-token', fetcher)

    expect(refresh.seasons.map(({ id }) => id)).toEqual([23614, 21646])
    expect(refresh.pageCount).toBe(2)

    const [firstInput, firstInit] = fetcher.mock.calls[0]
    const firstUrl = new URL(firstInput.toString())
    expect(firstUrl.pathname).toBe('/v3/football/seasons')
    expect(firstUrl.searchParams.get('filters')).toBe('seasonLeagues:8')
    expect(firstUrl.searchParams.get('order')).toBe('desc')
    expect(firstUrl.searchParams.get('per_page')).toBe('50')
    expect(firstUrl.searchParams.get('page')).toBe('1')
    expect(firstUrl.searchParams.has('api_token')).toBe(false)
    expect(new Headers(firstInit?.headers).get('Authorization')).toBe('private-token')
  })

  it('searches every routable entity with the same private token boundary', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(input.toString())

      if (url.pathname.startsWith('/v3/football/leagues/search/')) {
        return Response.json({ data: [makeCompetition()] })
      }

      if (url.pathname.startsWith('/v3/football/teams/search/')) {
        return Response.json({
          data: [
            {
              id: 9,
              sport_id: 1,
              country_id: 462,
              venue_id: 206,
              gender: 'male',
              name: 'Manchester City',
              image_path: 'https://cdn.sportmonks.com/images/soccer/teams/9/9.png',
              founded: 1880,
              placeholder: false
            }
          ]
        })
      }

      if (url.pathname.startsWith('/v3/football/players/search/')) {
        return Response.json({ data: [makePlayer()] })
      }

      return Response.json({
        data: [
          {
            id: 206,
            country_id: 462,
            name: 'Etihad Stadium',
            city_name: 'Manchester',
            image_path: 'https://cdn.sportmonks.com/images/soccer/venues/14/206.png'
          }
        ]
      })
    })

    const refresh = await fetchEntitySearch({ query: 'manchester' }, 'private-token', fetcher)

    expect(refresh.competitions[0].name).toBe('Premier League')
    expect(refresh.teams[0].name).toBe('Manchester City')
    expect(refresh.players[0].display_name).toBe('Quinten Timber')
    expect(refresh.venues[0].name).toBe('Etihad Stadium')
    expect(fetcher).toHaveBeenCalledTimes(4)

    const requests = fetcher.mock.calls.map(([input, init]) => ({
      headers: new Headers(init?.headers),
      url: new URL(input.toString())
    }))
    expect(requests.map(({ url }) => url.pathname)).toEqual([
      '/v3/football/leagues/search/manchester',
      '/v3/football/teams/search/manchester',
      '/v3/football/players/search/manchester',
      '/v3/football/venues/search/manchester'
    ])
    expect(requests.map(({ url }) => url.searchParams.get('include'))).toEqual([
      'country;currentSeason',
      'country;venue',
      'nationality;position;detailedPosition',
      'country'
    ])
    expect(requests.every(({ url }) => url.searchParams.get('per_page') === '8')).toBe(true)
    expect(requests.every(({ headers }) => headers.get('Authorization') === 'private-token')).toBe(
      true
    )
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

  it('fetches a filtered season statistics snapshot', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: {
          id: 23614,
          statistics: [
            {
              id: 701,
              model_id: 23614,
              type_id: 191,
              relation_id: null,
              value: { total: 92 }
            }
          ]
        },
        rate_limit: { remaining: 2_995, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchSeasonStatistics({ seasonId: 23614 }, 'private-token', fetcher)

    expect(refresh.statistics[0].value).toEqual({ total: 92 })
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/seasons/23614')
    expect(url.searchParams.get('include')).toBe('statistics')
    expect(url.searchParams.get('filters')).toContain('seasonStatisticTypes:')
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
    expect(firstUrl.searchParams.get('include')).toBe('participants;league;state;scores;periods')
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

  it('fetches team statistics for one season', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: {
          id: 9,
          statistics: [
            {
              id: 501,
              team_id: 9,
              season_id: 23614,
              has_values: true,
              details: [
                {
                  id: 801,
                  team_statistic_id: 501,
                  type_id: 214,
                  value: { count: 12 }
                }
              ]
            }
          ]
        },
        rate_limit: { remaining: 2_994, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchTeamStatistics(
      { seasonId: 23614, teamId: 9 },
      'private-token',
      fetcher
    )

    expect(refresh.statistics[0].value).toEqual({ count: 12 })
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/teams/9')
    expect(url.searchParams.get('include')).toBe('statistics.details')
    expect(url.searchParams.get('filters')).toContain('teamStatisticSeasons:23614')
    expect(url.searchParams.get('filters')).toContain('teamStatisticDetailTypes:')
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
  })

  it('validates season and team statistics identifiers', () => {
    expect(validateSeasonStatisticsInput({ seasonId: 23614 })).toEqual({ seasonId: 23614 })
    expect(validateTeamStatisticsInput({ seasonId: 23614, teamId: 9 })).toEqual({
      seasonId: 23614,
      teamId: 9
    })
    expect(() => validateTeamStatisticsInput({ seasonId: 0, teamId: 9 })).toThrow(
      'Choose a valid season.'
    )
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

  it('fetches the current team squad with players and positions', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [
          {
            id: 635741,
            transfer_id: 184008,
            player_id: 581086,
            team_id: 62,
            position_id: 26,
            detailed_position_id: 157,
            jersey_number: 13,
            start: '2023-01-23',
            end: null,
            player: makePlayer(),
            position: { id: 26, name: 'Midfielder', code: 'midfielder' },
            detailedPosition: { id: 157, name: 'Right Midfield', code: 'right-midfield' }
          }
        ],
        rate_limit: { remaining: 2_993, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchTeamSquad({ teamId: 62 }, 'private-token', fetcher)

    expect(refresh.squad[0].player?.display_name).toBe('Quinten Timber')
    expect(refresh.squad[0].jersey_number).toBe(13)

    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/squads/teams/62')
    expect(url.searchParams.get('include')).toBe('player.nationality;position;detailedPosition')
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
  })

  it('fetches a player profile with nationality and positions', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: {
          ...makePlayer(),
          nationality: { id: 38, name: 'Netherlands', iso2: 'NL' },
          position: { id: 26, name: 'Midfielder', code: 'midfielder' },
          detailedPosition: { id: 153, name: 'Central Midfield', code: 'central-midfield' }
        },
        rate_limit: { remaining: 2_992, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchPlayerById({ playerId: 6306068 }, 'private-token', fetcher)

    expect(refresh.player.nationality?.name).toBe('Netherlands')
    expect(refresh.player.detailedPosition?.name).toBe('Central Midfield')

    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/players/6306068')
    expect(url.searchParams.get('include')).toBe('nationality;position;detailedPosition')
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
  })

  it('returns recent appearances only when the player is in a confirmed lineup', async () => {
    const fixture = makeFixture()
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [
          {
            ...fixture,
            lineups: [
              {
                id: 91,
                fixture_id: fixture.id,
                player_id: 6306068,
                team_id: 62,
                position_id: 26,
                type_id: 11,
                player_name: 'Quinten Timber',
                jersey_number: 8
              }
            ]
          },
          { ...fixture, id: 2, lineups: [] }
        ],
        pagination: { current_page: 1, has_more: false },
        timezone: 'Europe/Stockholm'
      })
    )

    const refresh = await fetchPlayerAppearances(
      {
        playerId: 6306068,
        teamId: 62,
        startDate: '2026-05-30',
        endDate: '2026-08-28',
        timeZone: 'Europe/Stockholm'
      },
      'private-token',
      fetcher
    )

    expect(refresh.appearances).toHaveLength(1)
    expect(refresh.appearances[0].fixture.id).toBe(fixture.id)
    expect(refresh.appearances[0].fixture.lineups).toBeUndefined()
    expect(refresh.appearances[0].lineup.type_id).toBe(11)

    const url = new URL(fetcher.mock.calls[0][0].toString())
    expect(url.pathname).toBe('/v3/football/fixtures/between/2026-05-30/2026-08-28/62')
    expect(url.searchParams.get('include')).toBe('participants;league;state;scores;periods;lineups')
  })

  it('fetches a venue entity with country context', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: {
          id: 206,
          country_id: 462,
          city_id: 28146,
          name: 'Etihad Stadium',
          address: 'Rowsley Street',
          zipcode: 'M11 3FF',
          latitude: '53.483111',
          longitude: '-2.200397',
          capacity: 55097,
          image_path: 'https://cdn.sportmonks.com/images/soccer/venues/14/206.png',
          city_name: 'Manchester',
          surface: 'grass',
          national_team: false,
          country: { id: 462, name: 'England', iso2: 'GB' }
        },
        rate_limit: { remaining: 2_994, resets_in_seconds: 3_600 }
      })
    )

    const refresh = await fetchVenueById({ venueId: 206 }, 'private-token', fetcher)

    expect(refresh.venue.name).toBe('Etihad Stadium')
    expect(refresh.venue.country?.name).toBe('England')

    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(input.toString())
    expect(url.pathname).toBe('/v3/football/venues/206')
    expect(url.searchParams.get('include')).toBe('country')
    expect(url.searchParams.has('api_token')).toBe(false)
    expect(new Headers(init?.headers).get('Authorization')).toBe('private-token')
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
    expect(() => validateFixtureInput({ fixtureId: 0 })).toThrow('Choose a valid fixture.')
    expect(() =>
      validateFixtureHeadToHeadInput({ firstTeamId: 11, secondTeamId: 11, timeZone: 'UTC' })
    ).toThrow('Choose two different teams.')
    expect(() =>
      validateFixtureHeadToHeadInput({ firstTeamId: 11, secondTeamId: 22, timeZone: 'Not/AZone' })
    ).toThrow('The selected time zone is not valid.')
    expect(() => validateRefreshInput({ date: '2026-08-27', timeZone: 'Not/AZone' })).toThrow(
      'The selected time zone is not valid.'
    )
    expect(() => validateToken('token with spaces')).toThrow('Enter a valid Sportmonks token.')
    expect(() => validateStandingsInput({ seasonId: -1 })).toThrow('Choose a valid current season.')
    expect(() => validateCompetitionSeasonsInput({ competitionId: 0 })).toThrow(
      'Choose a valid competition.'
    )
    expect(() => validateTeamInput({ teamId: 0 })).toThrow('Choose a valid team.')
    expect(() => validateVenueInput({ venueId: 0 })).toThrow('Choose a valid venue.')
    expect(() => validatePlayerInput({ playerId: 0 })).toThrow('Choose a valid player.')
    expect(() => validateEntitySearchInput({ query: 'a' })).toThrow(
      'Enter at least two characters.'
    )
    expect(() =>
      validatePlayerAppearancesInput({
        playerId: 1,
        teamId: 0,
        startDate: '2026-08-01',
        endDate: '2026-08-28',
        timeZone: 'UTC'
      })
    ).toThrow('Choose a valid fixture range.')
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

function makePlayer(): SportmonksPlayer {
  return {
    id: 6306068,
    sport_id: 1,
    country_id: 38,
    nationality_id: 38,
    city_id: 93391,
    position_id: 26,
    detailed_position_id: 153,
    type_id: 26,
    common_name: 'Q. Timber',
    firstname: 'Quinten',
    lastname: 'Timber',
    name: 'Quinten Maduro',
    display_name: 'Quinten Timber',
    image_path: 'https://cdn.sportmonks.com/images/soccer/players/20/6306068.png',
    height: 177,
    weight: null,
    date_of_birth: '2001-06-17',
    gender: 'male'
  }
}
