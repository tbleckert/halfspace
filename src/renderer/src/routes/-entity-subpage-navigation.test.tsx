// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '@/routeTree.gen'

const pageInstances = vi.hoisted(() => ({
  competition: 0,
  fixture: 0,
  team: 0
}))

vi.mock('@/components/app-shell', async () => {
  const React = await import('react')
  const { Outlet } = await import('@tanstack/react-router')

  return {
    AppShell: () => React.createElement(Outlet)
  }
})

vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))

vi.mock('@/features/competitions/competition-workspace-page', async () => {
  const React = await import('react')

  return {
    CompetitionWorkspacePage: ({ view = 'overview' }: { view?: string }) => {
      const [instance] = React.useState(() => ++pageInstances.competition)
      return React.createElement(
        'div',
        { 'data-testid': 'competition-page' },
        `${instance}:${view}`
      )
    }
  }
})

vi.mock('@/features/fixtures/fixture-detail-page', async () => {
  const React = await import('react')

  return {
    FixtureDetailPage: ({ view = 'preview' }: { view?: string }) => {
      const [instance] = React.useState(() => ++pageInstances.fixture)
      return React.createElement('div', { 'data-testid': 'fixture-page' }, `${instance}:${view}`)
    }
  }
})

vi.mock('@/features/teams/team-page', async () => {
  const React = await import('react')

  return {
    TeamPage: ({ view = 'overview' }: { view?: string }) => {
      const [instance] = React.useState(() => ++pageInstances.team)
      return React.createElement('div', { 'data-testid': 'team-page' }, `${instance}:${view}`)
    }
  }
})

beforeEach(() => {
  pageInstances.competition = 0
  pageInstances.fixture = 0
  pageInstances.team = 0
})

describe('entity subpage navigation', () => {
  it('keeps the competition page mounted while its active view changes', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/competitions/579'] })
    })

    render(<RouterProvider router={router} />)

    expect((await screen.findByTestId('competition-page')).textContent).toBe('1:overview')

    await act(() =>
      router.navigate({
        to: '/competitions/$competitionId/fixtures',
        params: { competitionId: '579' }
      })
    )

    expect(screen.getByTestId('competition-page').textContent).toBe('1:fixtures')
    expect(pageInstances.competition).toBe(1)
  })

  it('keeps the team page mounted while its active view changes', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/teams/3603'] })
    })

    render(<RouterProvider router={router} />)

    expect((await screen.findByTestId('team-page')).textContent).toBe('1:overview')

    await act(() =>
      router.navigate({
        to: '/teams/$teamId/fixtures',
        params: { teamId: '3603' },
        search: { date: '2026-08-29' }
      })
    )

    expect(screen.getByTestId('team-page').textContent).toBe('1:fixtures')
    expect(pageInstances.team).toBe(1)

    await act(() =>
      router.navigate({
        to: '/teams/$teamId/squad',
        params: { teamId: '3603' }
      })
    )

    expect(screen.getByTestId('team-page').textContent).toBe('1:squad')
    expect(pageInstances.team).toBe(1)
  })

  it('keeps the fixture page mounted while its active view changes', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/fixtures/19636120'] })
    })

    render(<RouterProvider router={router} />)

    expect((await screen.findByTestId('fixture-page')).textContent).toBe('1:preview')

    await act(() =>
      router.navigate({
        to: '/fixtures/$fixtureId/stats',
        params: { fixtureId: '19636120' }
      })
    )

    expect(screen.getByTestId('fixture-page').textContent).toBe('1:stats')
    expect(pageInstances.fixture).toBe(1)
  })
})
