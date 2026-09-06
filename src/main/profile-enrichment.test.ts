import { describe, expect, it, vi } from 'vitest'
import {
  fetchCoachById,
  fetchFixtureById,
  fetchPlayerById,
  fetchRefereeById,
  fetchTeamById,
  fetchVenueById
} from './sportmonks'

const person = {
  id: 10,
  sport_id: 1,
  country_id: 462,
  nationality_id: 1578,
  city_id: 1,
  position_id: 27,
  detailed_position_id: 151,
  type_id: 27,
  name: 'Player',
  display_name: 'Player',
  height: null,
  weight: null,
  date_of_birth: null,
  gender: 'male'
}
const team = {
  id: 9,
  sport_id: 1,
  country_id: 462,
  venue_id: null,
  gender: 'male',
  name: 'Club',
  founded: null,
  placeholder: false
}
const city = { id: 1, name: 'Leeds', latitude: null, longitude: null }
const mockResponse = (data: unknown): ReturnType<typeof vi.fn<typeof fetch>> =>
  vi.fn<typeof fetch>(async () => Response.json({ data }))
const includes = (fetcher: ReturnType<typeof mockResponse>): string[] | undefined =>
  new URL(String(fetcher.mock.calls[0][0])).searchParams.get('include')?.split(';')

describe('supported profile enrichments', () => {
  it('requests birthplace, metadata, registrations and normalizes pending transfers', async () => {
    const fetcher = mockResponse({
      ...person,
      country: { id: 462, name: 'England' },
      city,
      metadata: [
        {
          id: 1,
          type_id: 229,
          values: 'left',
          type: { id: 229, name: 'Preferred Foot', code: 'preferred-foot' }
        }
      ],
      teams: [
        {
          id: 1,
          player_id: 10,
          team_id: 9,
          start: null,
          end: '2034-06-30',
          jersey_number: 9,
          captain: false,
          team
        }
      ],
      pendingtransfers: [
        {
          id: 2,
          sport_id: 1,
          player_id: 10,
          type_id: 1,
          from_team_id: null,
          to_team_id: 9,
          position_id: null,
          detailed_position_id: null,
          date: '2026-12-01',
          completed: false,
          career_ended: false,
          toteam: team
        }
      ]
    })
    const { player } = await fetchPlayerById({ playerId: 10 }, 'token', fetcher)
    expect(includes(fetcher)).toEqual(
      expect.arrayContaining([
        'country',
        'city',
        'metadata.type',
        'teams.team',
        'pendingTransfers.fromTeam',
        'pendingTransfers.toTeam',
        'pendingTransfers.type'
      ])
    )
    expect(player.city?.name).toBe('Leeds')
    expect(player.pendingTransfers?.[0].toTeam?.id).toBe(9)
    expect(player.pendingTransfers?.[0].from_team_id).toBeNull()
    expect(player.teams?.[0].end).toBe('2034-06-30')
  })

  it('distinguishes an empty pending feed from an omitted include', async () => {
    const empty = await fetchPlayerById(
      { playerId: 10 },
      'token',
      mockResponse({ ...person, pendingtransfers: [] })
    )
    const omitted = await fetchPlayerById({ playerId: 10 }, 'token', mockResponse(person))
    expect(empty.player.pendingTransfers).toEqual([])
    expect(omitted.player.pendingTransfers).toBeUndefined()
  })

  it('requests the named social channel together with the handle', async () => {
    const fetcher = mockResponse({
      ...team,
      socials: [
        {
          id: 1,
          value: '@Club',
          channel: { id: 2, name: 'Twitter', base_url: 'https://twitter.com/' }
        }
      ]
    })
    const result = await fetchTeamById({ teamId: 9 }, 'token', fetcher)
    expect(includes(fetcher)).toContain('socials.channel')
    expect(result.team.socials?.[0].channel?.name).toBe('Twitter')
  })

  it('loads a coach playing profile and referee background', async () => {
    const coachFetcher = mockResponse({ ...person, player_id: 10, player: person })
    const coach = await fetchCoachById({ coachId: 10 }, 'token', coachFetcher)
    expect(includes(coachFetcher)).toContain('player')
    expect(coach.coach.player?.id).toBe(10)
    const refereeFetcher = mockResponse({
      ...person,
      city,
      nationality: { id: 1578, name: 'Norway' }
    })
    const referee = await fetchRefereeById({ refereeId: 10 }, 'token', refereeFetcher)
    expect(includes(refereeFetcher)).toEqual(expect.arrayContaining(['city', 'nationality']))
    expect(referee.referee.city?.name).toBe('Leeds')
  })

  it('loads structured venue locations without manufacturing coordinates', async () => {
    const fetcher = mockResponse({ id: 204, name: 'Stadium', city })
    const { venue } = await fetchVenueById({ venueId: 204 }, 'token', fetcher)
    expect(includes(fetcher)).toContain('city')
    expect(venue.city?.latitude).toBeNull()
  })

  it('loads reported formations and group/tie context', async () => {
    const fetcher = mockResponse({
      id: 50,
      league_id: 8,
      season_id: 1,
      state_id: 5,
      placeholder: false,
      has_odds: false,
      formations: [
        { id: 1, fixture_id: 50, participant_id: 9, formation: '4-2-3-1', location: 'home' }
      ],
      group: { id: 3, name: 'Group A' },
      aggregate: {
        id: 4,
        league_id: 8,
        season_id: 1,
        stage_id: 2,
        name: 'Club A vs Club B',
        fixture_ids: [49, 50],
        result: '3-2',
        detail: null,
        winner_participant_id: 9
      }
    })
    const { fixture } = await fetchFixtureById({ fixtureId: 50 }, 'token', fetcher)
    expect(includes(fetcher)).toEqual(expect.arrayContaining(['formations', 'group', 'aggregate']))
    expect(fixture.formations?.[0].formation).toBe('4-2-3-1')
    expect(fixture.aggregate?.fixture_ids).toEqual([49, 50])
  })
})
