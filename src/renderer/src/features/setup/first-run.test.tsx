// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider
} from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionRefresh,
  writeEntitySearchRefresh
} from '@/data/db'
import { invalidateCompetitionRefresh } from '@/features/competitions/use-competitions'
import { invalidateSearchRefreshes } from '@/features/search/use-entity-search'
import { invalidateSubscriptionRefresh } from '@/features/subscription/use-subscription'
import { invalidateTvGuideRefreshes } from '@/features/broadcasts/use-tv-guide'
import { useTvCountry } from '@/features/broadcasts/use-tv-country'
import { ConnectionStateContext } from '@/features/credentials/connection-state-context'
import { FirstRunGate } from './first-run-gate'
import { readSetupStep, saveSetupStep } from './setup-progress'
import { SetupTvCountry } from './setup-tv-country'

const team = {
  id: 11,
  sport_id: 1,
  name: 'Malmö FF',
  country_id: 47,
  venue_id: null,
  gender: 'male',
  founded: 1910,
  placeholder: false,
  country: { id: 47, name: 'Sweden' }
}
const searchResponse = {
  competitions: [],
  teams: [team],
  players: [],
  coaches: [],
  referees: [],
  fixtures: [],
  venues: [],
  fetchedAt: Date.now()
}

beforeEach(async () => {
  localStorage.clear()
  invalidateCompetitionRefresh()
  invalidateSearchRefreshes()
  invalidateSubscriptionRefresh()
  invalidateTvGuideRefreshes()
  await clearSportmonksCache()
  await db.teamPins.clear()
  window.halfspace = {
    sportmonks: {
      refreshCompetitions: vi.fn().mockResolvedValue({
        ok: true,
        data: { competitions: [], fetchedAt: Date.now(), pageCount: 1 }
      }),
      searchEntities: vi.fn().mockResolvedValue({ ok: true, data: searchResponse }),
      refreshSubscription: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          plans: [],
          addOns: [],
          resources: [{ id: 142, description: 'Fixtures' }],
          enrichments: [{ id: 96, name: 'TV stations' }],
          fetchedAt: Date.now()
        }
      }),
      refreshTvGuide: vi.fn().mockImplementation(async (input) => ({
        ok: true,
        data: {
          ...input,
          fixtures: [
            {
              id: 1,
              league_id: 8,
              season_id: 1,
              state_id: 1,
              placeholder: false,
              has_odds: false,
              participants: [],
              scores: []
            }
          ],
          listings: [
            {
              id: 1,
              fixture_id: 1,
              tvstation_id: 1,
              country_id: 47,
              country: { id: 47, name: 'Sweden', image_path: null },
              tvstation: null
            }
          ],
          fetchedAt: Date.now()
        }
      }))
    }
  } as unknown as typeof window.halfspace
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
afterAll(() => db.close())

describe('personal first session', () => {
  it('keeps the workspace gated through selection, persists real pins, and finishes on Matchday', async () => {
    saveSetupStep('competitions')
    const { location } = renderGate('/history')
    await screen.findByRole('heading', { name: 'Your competitions' })
    fireEvent.click(screen.getByRole('button', { name: 'Choose teams' }))
    await screen.findByRole('heading', { name: 'Choose your teams' })
    expect(readSetupStep()).toBe('teams')
    expect(screen.queryByText('Historical page')).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search teams' }), {
      target: { value: 'Malmö' }
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Pin Malmö FF' }))
    await waitFor(async () => expect((await db.teamPins.get(11))?.name).toBe('Malmö FF'))
    expect(window.halfspace.sportmonks.searchEntities).toHaveBeenCalledWith({
      query: 'Malmö',
      entity: 'teams'
    })
    expect(window.halfspace.sportmonks.refreshTvGuide).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open Matchday' }))
    await screen.findByRole('heading', { name: 'Matchday' })
    expect(location().pathname).toBe('/')
    expect(location().search).toEqual({})
    expect(readSetupStep()).toBe('complete')
    cleanup()
    renderGate()
    await screen.findByRole('heading', { name: 'Matchday' })
    expect(screen.queryByRole('heading', { name: 'Choose your teams' })).toBeNull()
  })

  it('resumes team selection after restarting and lets the user continue without pins', async () => {
    saveSetupStep('teams')
    renderGate()
    await screen.findByRole('heading', { name: 'Choose your teams' })
    fireEvent.click(screen.getByRole('button', { name: 'Open Matchday' }))
    await screen.findByRole('heading', { name: 'Matchday' })
    expect(await db.teamPins.count()).toBe(0)
  })

  it('skips the whole personalization flow and does not replay it on reopening', async () => {
    saveSetupStep('competitions')
    renderGate()
    fireEvent.click(await screen.findByRole('button', { name: 'Skip setup' }))
    await screen.findByRole('heading', { name: 'Matchday' })
    expect(readSetupStep()).toBe('complete')
  })

  it('shows subscribed competition identities and preserves cached selections offline', async () => {
    await writeCompetitionRefresh({
      competitions: [
        {
          id: 8,
          name: 'Premier League',
          country_id: 462,
          active: true,
          type: 'league',
          short_code: 'EPL',
          image_path: null,
          country: { id: 462, name: 'England' }
        }
      ],
      fetchedAt: Date.now(),
      pageCount: 1
    })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    saveSetupStep('competitions')
    renderGate()
    expect(await screen.findByText('Premier League')).toBeTruthy()
    expect(window.halfspace.sportmonks.refreshCompetitions).not.toHaveBeenCalled()
    await act(() => writeEntitySearchRefresh(searchResponse))
    fireEvent.click(screen.getByRole('button', { name: 'Choose teams' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search teams' }), {
      target: { value: 'Malmö' }
    })
    expect(await screen.findByRole('button', { name: 'Pin Malmö FF' })).toBeTruthy()
    expect(window.halfspace.sportmonks.searchEntities).not.toHaveBeenCalled()
  })

  it('distinguishes failed competition access from an empty response and offers recovery', async () => {
    vi.mocked(window.halfspace.sportmonks.refreshCompetitions).mockResolvedValue({
      ok: false,
      error: { code: 'unauthorized', message: 'Invalid API token.' }
    })
    saveSetupStep('competitions')
    renderGate()
    await screen.findByText('Invalid API token.')
    expect(screen.queryByText(/No competitions were returned/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Change token' }))
    await screen.findByRole('heading', { name: 'Connect Sportmonks' })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await screen.findByRole('heading', { name: 'Your competitions' })
  })

  it('keeps the flow open if saving completion fails and can retry', async () => {
    saveSetupStep('teams')
    renderGate('/history')
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Open Matchday' }))
    await screen.findByText('Could not finish setup. Please try again.')
    expect(screen.queryByRole('heading', { name: 'Matchday' })).toBeNull()
    storage.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Open Matchday' }))
    await screen.findByRole('heading', { name: 'Matchday' })
  })

  it('shares the optional country with TV Guide and retains it after football cache clearing', async () => {
    render(<SetupTvCountry online />)
    const select = await screen.findByRole('combobox', { name: 'Broadcast country' })
    fireEvent.change(select, { target: { value: '47' } })
    cleanup()
    await clearSportmonksCache()
    render(<CountryPreference />)
    expect(await screen.findByText('Sweden')).toBeTruthy()
  })

  it('does not request TV listings when subscription access explicitly excludes them', async () => {
    vi.mocked(window.halfspace.sportmonks.refreshSubscription).mockResolvedValue({
      ok: true,
      data: { plans: [], addOns: [], resources: [], enrichments: [], fetchedAt: Date.now() }
    })
    render(<SetupTvCountry online />)
    await screen.findByText('TV listings aren’t included in your Sportmonks plan.')
    expect(window.halfspace.sportmonks.refreshTvGuide).not.toHaveBeenCalled()
  })
})

function CountryPreference(): React.JSX.Element {
  return <p>{useTvCountry().country?.name ?? 'No country'}</p>
}

function renderGate(path = '/'): { location: () => { pathname: string; search: object } } {
  const root = createRootRoute({
    component: () => (
      <ConnectionStateContext.Provider
        value={{
          connection: { configured: true },
          error: null,
          rateLimit: null,
          reload: async () => {},
          clearToken: async () => ({ ok: true, data: null }),
          saveToken: async () => ({ ok: true, data: { configured: true } })
        }}
      >
        <FirstRunGate>
          <Outlet />
        </FirstRunGate>
      </ConnectionStateContext.Provider>
    )
  })
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Matchday</h1>
  })
  const history = createRoute({
    getParentRoute: () => root,
    path: '/history',
    component: () => <h1>Historical page</h1>
  })
  const router = createRouter({
    routeTree: root.addChildren([index, history]),
    history: createMemoryHistory({ initialEntries: [path] })
  })
  render(<RouterProvider router={router} />)
  return { location: () => router.state.location }
}
