// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import { FixtureAbsences } from './fixture-absences'
import { FixtureWeather } from './fixture-weather'

const fixture: SportmonksFixture = {
  id: 50,
  league_id: 8,
  season_id: 1,
  state_id: 5,
  placeholder: false,
  has_odds: false,
  participants: [
    { id: 51, name: 'Crystal Palace', meta: { location: 'home' } },
    { id: 19, name: 'Arsenal', meta: { location: 'away' } }
  ],
  scores: [],
  sidelined: [
    {
      id: 10,
      fixture_id: 50,
      participant_id: 51,
      player_id: 100,
      type_id: 595,
      type: { id: 595, name: 'Back Injury' }
    },
    {
      id: 11,
      fixture_id: 50,
      participant_id: 19,
      player_id: 101,
      type_id: 500,
      type: { id: 500, name: 'Suspended' }
    }
  ],
  weatherreport: {
    id: 1,
    fixture_id: 50,
    metric: 'celcius',
    type: 'actual',
    current: { temp: 0, humidity: '80%', description: 'snow' }
  }
}

function renderContext(value: SportmonksFixture): void {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <FixtureAbsences
          fixture={value}
          context={{ competition: 8, season: 1, date: '2026-09-03' }}
          online={false}
        />
        <FixtureWeather report={value.weatherreport} />
      </>
    )
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  render(<RouterProvider router={router} />)
}

describe('fixture preview context', () => {
  it('groups match absences by participant and links players with team and season context', async () => {
    renderContext(fixture)
    const home = await screen.findByRole('region', { name: 'Crystal Palace absences' })
    const away = screen.getByRole('region', { name: 'Arsenal absences' })
    const player = within(home).getByRole('link', { name: /Player 100 Back Injury/ })
    const url = new URL(player.getAttribute('href')!, 'https://halfspace.local')
    expect(url.pathname).toBe('/players/100')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      competition: '8',
      date: '2026-09-03',
      season: '1',
      team: '51'
    })
    expect(within(away).getByRole('link', { name: /Player 101 Suspended/ })).not.toBeNull()
    expect(within(home).queryByText('Suspended')).toBeNull()
    expect(screen.queryByText(/return|recovered/i)).toBeNull()
    expect(screen.getByText('0°C')).not.toBeNull()
    expect(screen.getByText('Recorded')).not.toBeNull()
  })

  it('distinguishes absent data from an empty list without inventing availability', async () => {
    renderContext({ ...fixture, sidelined: undefined, weatherreport: null })
    expect(await screen.findByText('Absence data unavailable')).not.toBeNull()
    expect(screen.queryByText('No absences reported')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Weather' })).toBeNull()
  })

  it('keeps a completed match absence visible even if a player has since recovered', async () => {
    renderContext({ ...fixture, sidelined: [fixture.sidelined![0]] })
    expect(await screen.findByRole('link', { name: /Back Injury/ })).not.toBeNull()
    expect(screen.getByText('No absences reported')).not.toBeNull()
  })

  it('does not turn a report without weather values into an empty card', () => {
    const { container } = render(<FixtureWeather report={{ id: 1, fixture_id: 50 }} />)
    expect(container.textContent).toBe('')
  })
})
