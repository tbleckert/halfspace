// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/components/app-shell'
import { SettingsPage } from '@/features/settings/settings-page'
import { currentTimeZone, isoDateInTimeZone } from '@/lib/date'
import { ConnectionStateProvider } from './connection-state-provider'

const getConnectionState = vi.fn()
const saveToken = vi.fn()
const clearToken = vi.fn()
const getRateLimit = vi.fn()
const onRateLimitChange = vi.fn()

beforeEach(() => {
  localStorage.clear()
  getConnectionState.mockReset().mockResolvedValue({ configured: false })
  saveToken.mockReset().mockResolvedValue({ ok: true, data: { configured: true } })
  clearToken.mockReset().mockResolvedValue({ ok: true, data: null })
  getRateLimit.mockReset().mockResolvedValue(null)
  onRateLimitChange.mockReset().mockReturnValue(vi.fn())

  window.halfspace = {
    credentials: {
      getConnectionState,
      saveToken,
      clearToken
    },
    sportmonks: {
      refreshFixtures: vi.fn(),
      refreshFixture: vi.fn(),
      refreshFixtureHeadToHead: vi.fn(),
      refreshFixtureOdds: vi.fn(),
      refreshCompetitions: vi.fn(),
      refreshCompetitionSeasons: vi.fn(),
      refreshStandings: vi.fn(),
      refreshSeasonStatistics: vi.fn(),
      refreshCompetitionFixtures: vi.fn(),
      refreshTeam: vi.fn(),
      refreshTeamFixtures: vi.fn(),
      refreshTeamSquad: vi.fn(),
      refreshTeamStatistics: vi.fn(),
      refreshVenue: vi.fn(),
      refreshPlayer: vi.fn(),
      refreshPlayerAppearances: vi.fn(),
      getRateLimit,
      onRateLimitChange,
      searchEntities: vi.fn()
    }
  }
})

afterEach(() => vi.restoreAllMocks())

describe('Sportmonks connection flow', () => {
  it('gates the workspace until setup and returns to setup after disconnecting', async () => {
    const rootRoute = createRootRoute({
      component: () => (
        <ConnectionStateProvider>
          <AppShell />
        </ConnectionStateProvider>
      )
    })
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <h1>Matchday</h1>
    })
    const settingsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'settings',
      component: () => <SettingsPage />
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, settingsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] })
    })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Connect Sportmonks' })).toBeDefined()
    expect(screen.queryByRole('navigation')).toBeNull()

    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'test-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'Matchday' })).toBeDefined()
    expect(screen.getByRole('navigation')).toBeDefined()
    expect(saveToken).toHaveBeenCalledWith({ token: 'test-token' })

    fireEvent.click(screen.getByRole('link', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))

    expect(await screen.findByRole('heading', { name: 'Connect Sportmonks' })).toBeDefined()
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(clearToken).toHaveBeenCalledOnce()
  })

  it('keeps an entity rate-limit notice beside connection status across navigation', async () => {
    getConnectionState.mockResolvedValue({ configured: true })
    getRateLimit.mockResolvedValue({
      remaining: 0,
      requestedEntity: 'Fixture',
      resetsAt: Date.now() + 30 * 60 * 1_000
    })
    const rootRoute = createRootRoute({
      component: () => (
        <ConnectionStateProvider>
          <AppShell />
        </ConnectionStateProvider>
      )
    })
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <h1>Matchday</h1>
    })
    const settingsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'settings',
      component: () => <SettingsPage />
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, settingsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] })
    })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Matchday' })).toBeDefined()

    expect(await screen.findByText('Fixture limit reached')).toBeDefined()
    expect(screen.getByText(/^Resets /)).toBeDefined()

    fireEvent.click(screen.getByRole('link', { name: 'Settings' }))

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeDefined()
    expect(screen.getByText('Fixture limit reached')).toBeDefined()
  })

  it('updates the Matchday link when the calendar date changes while the app remains open', async () => {
    getConnectionState.mockResolvedValue({ configured: true })
    const timeZone = currentTimeZone()
    const firstTimestamp = Date.UTC(2026, 7, 30, 12)
    const nextTimestamp = Date.UTC(2026, 7, 31, 12)
    let now = firstTimestamp
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const rootRoute = createRootRoute({
      component: () => (
        <ConnectionStateProvider>
          <AppShell />
        </ConnectionStateProvider>
      )
    })
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <h1>Matchday</h1>
    })
    const settingsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'settings',
      component: () => <SettingsPage />
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, settingsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] })
    })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Matchday' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Matchday' }).getAttribute('href')).toContain(
      `date=${isoDateInTimeZone(firstTimestamp, timeZone)}`
    )

    now = nextTimestamp
    fireEvent(window, new Event('focus'))

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Matchday' }).getAttribute('href')).toContain(
        `date=${isoDateInTimeZone(nextTimestamp, timeZone)}`
      )
    )

    fireEvent.click(screen.getByRole('link', { name: 'Settings' }))

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Matchday' }).getAttribute('href')).toContain(
      `date=${isoDateInTimeZone(nextTimestamp, timeZone)}`
    )
  })
})
