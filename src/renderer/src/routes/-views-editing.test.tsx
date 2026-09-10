// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { clearSportmonksCache, db, writeCompetitionRefresh } from '@/data/db'
import { routeTree } from '@/routeTree.gen'
import { mockViewsApi } from '../../../test/view-api'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))

beforeEach(async () => {
  window.halfspace = { views: mockViewsApi() } as typeof window.halfspace
  await clearSportmonksCache()
  await db.savedViews.clear()
  await writeCompetitionRefresh({
    competitions: [8, 384].map((id) => ({
      id,
      country_id: 1,
      active: true,
      name: id === 8 ? 'Premier League' : 'Serie A',
      currentseason: { id: id === 8 ? 12 : 22, league_id: id, name: '2026/27', is_current: true }
    })),
    fetchedAt: Date.now(),
    pageCount: 1
  })
})
afterAll(() => db.close())

function openViews(): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/views'] })
  })
  render(<RouterProvider router={router} />)
  return router
}

it('opens, saves, and reopens a starter offline without an AI key or generation request', async () => {
  const router = openViews()
  fireEvent.change(await screen.findByLabelText('Competition and season'), {
    target: { value: '384:22' }
  })
  fireEvent.click(screen.getByRole('button', { name: /Goals & assists/ }))
  expect(((await screen.findByLabelText('View name')) as HTMLInputElement).value).toBe(
    'Serie A · 2026/27'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(() => expect(router.state.location.search.view).toBeTruthy())
  const id = router.state.location.search.view!
  const saved = await db.savedViews.get(id)
  expect(saved?.spec.blocks).toHaveLength(2)
  expect(
    saved?.spec.blocks.every((block) => block.competitionId === 384 && block.seasonId === 22)
  ).toBe(true)
  await act(() => router.navigate({ to: '/views', search: {} }))
  await act(() => router.navigate({ to: '/views', search: { view: id } }))
  expect(((await screen.findByLabelText('View name')) as HTMLInputElement).value).toBe(
    'Serie A · 2026/27'
  )
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('edits block content and layout, undoes removal, and persists the result without AI', async () => {
  const router = openViews()
  fireEvent.click(await screen.findByRole('button', { name: /Goals & assists/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit blocks' }))
  fireEvent.change(await screen.findByLabelText('New block'), { target: { value: 'recent' } })
  fireEvent.change(screen.getByLabelText('Competition and season for new block'), {
    target: { value: '384:22' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
  fireEvent.change(await screen.findByLabelText('Width of block 1'), { target: { value: 'full' } })
  fireEvent.click(screen.getByRole('button', { name: 'Move block 3 up' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove block 2' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(() => expect(router.state.location.search.view).toBeTruthy())
  const saved = await db.savedViews.get(router.state.location.search.view!)
  expect(saved?.spec.blocks).toMatchObject([
    { type: 'leaders', category: 'goals', span: 'full', competitionId: 8, seasonId: 12 },
    { type: 'fixtures', period: 'recent', competitionId: 384, seasonId: 22 },
    { type: 'leaders', category: 'assists', competitionId: 8, seasonId: 12 }
  ])
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})
