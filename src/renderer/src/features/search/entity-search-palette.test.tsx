// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { EntitySearchPalette } from './entity-search-palette'

describe('entity search palette', () => {
  it('opens from the sidebar and Command-K, then returns focus when closed', async () => {
    renderPalette()
    const trigger = await screen.findByRole('button', { name: 'Search' })

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Search Halfspace' })).not.toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('combobox'))

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)

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
})

function renderPalette(): void {
  const rootRoute = createRootRoute({ component: () => <EntitySearchPalette online={false} /> })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  })

  render(<RouterProvider router={router} />)
}
