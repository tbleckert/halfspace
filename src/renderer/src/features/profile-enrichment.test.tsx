// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { expect, it } from 'vitest'
import type { SportmonksFixture, SportmonksPlayer, SportmonksTransfer } from '@shared/contracts'
import { PlayerRegistrations } from './players/player-registrations'
import { PlayerPendingTransfers } from './players/player-pending-transfers'
import { playerBirthplace, playerPreferredFoot } from './players/player-profile-data'
import { teamSocialUrl } from './teams/team-socials-data'
import { VenueLocation } from './venues/venue-location'
import { locationMapUrl } from './venues/venue-location-data'
import { FixtureLineups } from './fixtures/fixture-lineups'
import { FixtureTie } from './fixtures/fixture-tie'
import { CoachPlayerProfile } from './coaches/coach-player-profile'
import { RefereeBackground } from './referees/referee-background'

const player: SportmonksPlayer = {
  id: 10,
  sport_id: 1,
  country_id: 462,
  nationality_id: 1578,
  city_id: 1,
  position_id: null,
  detailed_position_id: null,
  type_id: null,
  name: 'Player',
  display_name: 'Player',
  height: null,
  weight: null,
  date_of_birth: null,
  gender: null
}
const context = { competition: 8, season: 1, date: '2026-09-06' }
const transfer: SportmonksTransfer = {
  id: 1,
  sport_id: 1,
  player_id: 10,
  type_id: 1,
  position_id: null,
  detailed_position_id: null,
  from_team_id: null,
  to_team_id: 9,
  date: '2027-01-01',
  career_ended: false,
  completed: false,
  amount: 1000000
}
function renderWithRouter(component: React.JSX.Element): void {
  const routeTree = createRootRoute({ component: () => component })
  render(
    <RouterProvider
      router={createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) })}
    />
  )
}

it('keeps birthplace distinct from nationality and displays only scalar preferred-foot metadata', () => {
  const value = {
    ...player,
    city: { id: 1, name: 'Leeds' },
    country: { id: 462, name: 'England' },
    nationality: { id: 1578, name: 'Norway' },
    metadata: [{ id: 1, type_id: 229, values: 'left' }]
  }
  expect(playerBirthplace(value)).toBe('Leeds, England')
  expect(playerPreferredFoot(value)).toBe('Left')
  expect(
    playerPreferredFoot({
      ...player,
      metadata: [{ id: 1, type_id: 229, values: { foot: 'left' } }]
    })
  ).toBeNull()
  expect(playerBirthplace(player)).toBeNull()
})

it('keeps reported registration dates without declaring an expired record current', async () => {
  renderWithRouter(
    <PlayerRegistrations
      online={false}
      competitionId={8}
      season={1}
      registrations={[
        {
          id: 1,
          player_id: 10,
          team_id: 9,
          start: null,
          end: '2019-09-05',
          jersey_number: 9,
          captain: true
        }
      ]}
    />
  )
  const link = await screen.findByRole('link', { name: 'Team 9' })
  expect(link.getAttribute('href')).toContain('season=1')
  expect(screen.getByLabelText('Shirt number 9')).not.toBeNull()
  expect(screen.getByText('Captain')).not.toBeNull()
  expect(screen.queryByText(/current|active/i)).toBeNull()
})

it('shows pending moves without inferring free agency, fees, or completed transfers', async () => {
  renderWithRouter(
    <PlayerPendingTransfers
      transfers={[transfer, { ...transfer, id: 2, completed: true, date: '2020-01-01' }]}
      online={false}
      competitionId={8}
      season={1}
    />
  )
  expect(await screen.findByText('Not reported')).not.toBeNull()
  expect(screen.getByRole('link', { name: 'Team 9' }).getAttribute('href')).toContain('season=1')
  expect(screen.queryByText(/free agent|1,000,000|2020/i)).toBeNull()
})

it.each([undefined, []])(
  'distinguishes unavailable and empty pending transfers (%s)',
  (transfers) => {
    render(<PlayerPendingTransfers transfers={transfers} online={false} />)
    expect(
      screen.getByText(
        transfers ? 'No pending transfers reported' : 'Pending transfers not available'
      )
    ).not.toBeNull()
  }
)

it('builds social links only from secure URLs or reported channels and valid handles', () => {
  const social = {
    id: 1,
    value: '@Arsenal',
    channel: { id: 2, name: 'Twitter', base_url: 'https://www.twitter.com/' }
  }
  expect(teamSocialUrl(social)).toBe('https://www.twitter.com/Arsenal')
  expect(teamSocialUrl({ ...social, value: 'javascript:alert(1)' })).toBeNull()
  expect(teamSocialUrl({ ...social, value: '//elsewhere.example' })).toBeNull()
  expect(teamSocialUrl({ ...social, value: 'https://club.example/news' })).toBe(
    'https://club.example/news'
  )
  expect(teamSocialUrl({ ...social, channel: null })).toBeNull()
})

it('never presents city coordinates as the stadium location', () => {
  render(
    <VenueLocation
      venue={{
        id: 1,
        name: 'Stadium',
        city: { id: 2, name: 'London', latitude: '51.5', longitude: '-0.1' }
      }}
    />
  )
  expect(screen.getByRole('link', { name: 'View city map' }).getAttribute('href')).toContain(
    'mlat=51.5'
  )
  expect(screen.queryByRole('link', { name: 'View stadium map' })).toBeNull()
  expect(locationMapUrl('', '')).toBeNull()
  expect(locationMapUrl(null, 0)).toBeNull()
  expect(locationMapUrl(91, 0)).toBeNull()
  expect(locationMapUrl(0, 0)).toContain('mlat=0&mlon=0')
})

it('shows reported formations even when individual team sheets are unavailable', async () => {
  renderWithRouter(
    <FixtureLineups
      home={{ id: 9, name: 'Home' }}
      away={{ id: 8, name: 'Away' }}
      lineups={[]}
      events={[]}
      online={false}
      context={context}
      formations={[{ id: 1, fixture_id: 50, participant_id: 9, formation: '4-2-3-1' }]}
    />
  )
  expect(await screen.findByText('4-2-3-1')).not.toBeNull()
  expect(screen.getByText('Lineups not available')).not.toBeNull()
})

it('links only provider-reported related matches with the actual tie season', async () => {
  const fixture: SportmonksFixture = {
    id: 50,
    league_id: 8,
    season_id: 1,
    state_id: 5,
    placeholder: false,
    has_odds: false,
    participants: [{ id: 9, name: 'Winner' }],
    scores: [],
    aggregate: {
      id: 1,
      league_id: 8,
      season_id: 1,
      stage_id: 2,
      fixture_ids: [49, 50, 49],
      name: 'Tie',
      result: '3-2',
      detail: null,
      winner_participant_id: 9
    }
  }
  renderWithRouter(<FixtureTie fixture={fixture} context={{ season: 999 }} online={false} />)
  expect(await screen.findByText('3-2')).not.toBeNull()
  expect(screen.getByText('Winner')).not.toBeNull()
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(1)
  expect(links[0].getAttribute('href')).toBe('/fixtures/49?season=1&competition=8')
})

it('links a coach to the reported playing profile and omits missing referee details', async () => {
  renderWithRouter(
    <>
      <CoachPlayerProfile player={player} online={false} competitionId={8} season={1} />
      <RefereeBackground
        referee={{ id: 1, name: 'Referee', display_name: 'Referee', country_id: null }}
      />
    </>
  )
  const link = await screen.findByRole('link', { name: 'Player' })
  expect(link.getAttribute('href')).toContain('/players/10/career')
  expect(link.getAttribute('href')).toContain('season=1')
  expect(screen.queryByText('Details')).toBeNull()
})
