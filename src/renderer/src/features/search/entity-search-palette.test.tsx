// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { writeCompetitionRefresh, writeEntitySearchRefresh } from '@/data/db'
import { EntitySearchPalette } from './entity-search-palette'

describe('entity search palette', () => {
  it('opens from the sidebar and Command-K, then returns focus when closed', async () => {
    renderPalette()
    const trigger = await screen.findByRole('button', { name: 'Search' })

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Search Halfspace' })).not.toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox')))

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))

    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(screen.getByRole('dialog', { name: 'Search Halfspace' })).not.toBeNull()
  })

  it('shows the results region only after a query is entered', async () => {
    renderPalette()

    fireEvent.click(await screen.findByRole('button', { name: 'Search' }))
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Arsenal' } })
    expect(screen.getByRole('listbox')).not.toBeNull()
  })

  it('dismisses with Escape when focus is on a search result', async () => {
    await writeCompetitionRefresh({
      competitions: [{ id: 8, country_id: 1, name: 'Premier League', active: true }],
      fetchedAt: Date.now(),
      pageCount: 1
    })
    renderPalette()
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Premier' } })
    const option = await screen.findByRole('option', { name: 'Premier League' })
    option.focus()
    fireEvent.keyDown(option, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it.each([
    ['Beaton', 'J. Beaton', 'Opened referee'],
    ['Lecce', 'Lecce vs Roma', 'Opened match']
  ])('opens a cached result for %s from the palette', async (query, name, heading) => {
    await writeEntitySearchRefresh({
      competitions: [],
      teams: [],
      players: [],
      coaches: [],
      venues: [],
      referees: [
        {
          id: 14468,
          name: 'John Beaton',
          display_name: 'J. Beaton',
          country_id: 1161,
          country: { id: 1161, name: 'Scotland' }
        }
      ],
      fixtures: [
        {
          id: 50,
          name: 'Lecce vs Roma',
          league_id: 384,
          season_id: 1,
          state_id: 1,
          has_odds: false,
          placeholder: false,
          participants: [],
          scores: []
        }
      ],
      fetchedAt: Date.now()
    })
    renderPalette()
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: query } })
    fireEvent.click(await screen.findByRole('option', { name: new RegExp(name) }))
    expect(await screen.findByRole('heading', { name: heading })).not.toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

function renderPalette(): void {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <EntitySearchPalette online={false} />
        <Outlet />
      </>
    )
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/fixtures/$fixtureId',
        component: () => <h1>Opened match</h1>
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/referees/$refereeId',
        component: () => <h1>Opened referee</h1>
      })
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  })

  render(<RouterProvider router={router} />)
}
