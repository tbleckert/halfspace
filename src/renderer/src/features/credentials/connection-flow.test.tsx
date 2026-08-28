// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/components/app-shell'
import { SettingsPage } from '@/features/settings/settings-page'
import { ConnectionStateProvider } from './connection-state-provider'

const getConnectionState = vi.fn()
const saveToken = vi.fn()
const clearToken = vi.fn()

beforeEach(() => {
  getConnectionState.mockReset().mockResolvedValue({ configured: false })
  saveToken.mockReset().mockResolvedValue({ ok: true, data: { configured: true } })
  clearToken.mockReset().mockResolvedValue({ ok: true, data: null })

  window.halfspace = {
    credentials: {
      getConnectionState,
      saveToken,
      clearToken
    },
    sportmonks: {
      refreshFixtures: vi.fn(),
      refreshCompetitions: vi.fn(),
      refreshStandings: vi.fn(),
      refreshCompetitionFixtures: vi.fn(),
      refreshTeam: vi.fn(),
      refreshTeamFixtures: vi.fn(),
      refreshVenue: vi.fn()
    }
  }
})

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
})
