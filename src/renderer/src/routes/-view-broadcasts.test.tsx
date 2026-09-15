// @vitest-environment jsdom
import { selectOption } from '../../../test/select-option'
import { viewBlockTypes } from '@/features/views/view-editing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeTeamRefresh,
  writeFixtureTvRefresh,
  writeTeamFixtureRefresh,
  writeSubscriptionRefresh
} from '@/data/db'
import type { SportmonksFixture, SportmonksTvListing } from '@shared/contracts'
import type { ViewSpec } from '@shared/views'
import { routeTree } from '@/routeTree.gen'
import { mockViewsApi } from '../../../test/view-api'
import { saveView } from '@/features/views/saved-views'
import { teamViewFixtureInput } from '@/features/views/team-view-data'
import { currentTimeZone, todayInTimeZone } from '@/lib/date'

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
const connection = vi.hoisted(() => ({ online: false }))
vi.mock('@/lib/use-online', () => ({ useOnline: () => connection.online }))
const spec: ViewSpec = {
  version: 3,
  title: 'My match',
  message: '',
  blocks: [
    { id: 'next', type: 'team-next-match', teamId: 19, span: 2 },
    {
      id: 'tv',
      type: 'fixture-broadcasts',
      fixtureSourceBlockId: 'next',
      countryId: 'preferred',
      span: 1
    }
  ]
}
function fixture(id: number, teamId = 19): SportmonksFixture {
  return {
    id,
    league_id: 8,
    season_id: 12,
    state_id: 1,
    name: `Match ${id}`,
    starting_at_timestamp: (Date.now() + id * 3600000) / 1000,
    placeholder: false,
    has_odds: false,
    scores: [],
    participants: [
      { id: teamId, name: teamId === 19 ? 'Arsenal' : 'Liverpool', meta: { location: 'home' } },
      { id: 20, name: 'Chelsea', meta: { location: 'away' } }
    ]
  }
}
function listing(fixtureId: number, id: number, name: string, countryId = 47): SportmonksTvListing {
  return {
    id,
    fixture_id: fixtureId,
    tvstation_id: id,
    country_id: countryId,
    tvstation: { id, name, image_path: null, url: null },
    country: { id: countryId, name: countryId === 47 ? 'Sweden' : 'Norway', image_path: null }
  }
}
async function matches(teamId: number, fixtures: SportmonksFixture[]): Promise<void> {
  const timeZone = currentTimeZone()
  await writeTeamFixtureRefresh(teamViewFixtureInput(teamId, todayInTimeZone(timeZone), timeZone), {
    timeZone,
    fetchedAt: Date.now(),
    pageCount: 1,
    fixtures
  })
}
function open(): ReturnType<typeof createRouter<typeof routeTree>> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/views?view=match'] })
  })
  render(<RouterProvider router={router} />)
  return router
}
beforeEach(async () => {
  connection.online = false
  window.halfspace = { views: mockViewsApi() } as typeof window.halfspace
  localStorage.clear()
  localStorage.setItem('halfspace:tv-country', JSON.stringify({ id: '47', name: 'Sweden' }))
  await clearSportmonksCache()
  await db.savedViews.clear()
  for (const [id, name] of [
    [19, 'Arsenal'],
    [21, 'Liverpool']
  ] as const)
    await writeTeamRefresh({
      fetchedAt: Date.now(),
      team: {
        id,
        name,
        sport_id: 1,
        country_id: 1,
        venue_id: null,
        gender: 'male',
        founded: 1886,
        placeholder: false
      }
    })
  await matches(19, [fixture(10), fixture(11)])
  await writeFixtureTvRefresh(10, {
    fetchedAt: Date.now(),
    listings: [listing(10, 1, 'Swedish Sports'), listing(10, 2, 'Norwegian Sports', 1578)]
  })
  await saveView('match', spec)
})
afterAll(() => db.close())

it('uses the preferred country, keeps local edits through undo, saving, reopening and duplication', async () => {
  const router = open()
  await screen.findByRole('link', { name: 'Swedish Sports' })
  expect(screen.queryByRole('link', { name: 'Norwegian Sports' })).toBeNull()
  await selectOption(screen.getByLabelText('Broadcast country'), 'Norway')
  await screen.findByRole('link', { name: 'Norwegian Sports' })
  expect(screen.queryByRole('link', { name: 'Swedish Sports' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('link', { name: 'Swedish Sports' })
  await selectOption(screen.getByLabelText('Broadcast country'), 'Norway')
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('match'))?.spec.blocks[1]).toMatchObject({ countryId: 1578 })
  )
  await act(() => router.navigate({ to: '/views', search: {} }))
  await act(() => router.navigate({ to: '/views', search: { view: 'match' } }))
  await screen.findByRole('link', { name: 'Norwegian Sports' })
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate view' }))
  await waitFor(() => expect(router.state.location.search.view).not.toBe('match'))
  const copy = await db.savedViews.get(router.state.location.search.view!)
  expect(copy?.spec.blocks).toEqual([spec.blocks[0], { ...spec.blocks[1], countryId: 1578 }])
  expect(JSON.parse(localStorage.getItem('halfspace:tv-country')!)).toEqual({
    id: '47',
    name: 'Sweden'
  })
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('follows the linked fixture and team without showing listings from a previous match', async () => {
  open()
  await screen.findByRole('link', { name: 'Swedish Sports' })
  await act(() => matches(19, [fixture(11)]))
  await screen.findByText('TV listings not cached for offline use.')
  expect(screen.queryByRole('link', { name: 'Swedish Sports' })).toBeNull()
  await act(() =>
    writeFixtureTvRefresh(10, {
      fetchedAt: Date.now(),
      listings: [listing(10, 3, 'Late old listing')]
    })
  )
  expect(screen.queryByRole('link', { name: 'Late old listing' })).toBeNull()
  await act(() =>
    writeFixtureTvRefresh(11, {
      fetchedAt: Date.now(),
      listings: [listing(11, 4, 'Next fixture TV', 1578)]
    })
  )
  await screen.findByText('No broadcasts listed in Sweden for this fixture.')
  expect(screen.getByLabelText('Broadcast country').textContent).toContain('Preferred · Sweden')
  await selectOption(screen.getByLabelText('Broadcast country'), 'All countries')
  expect(
    (await screen.findByRole('link', { name: /Next fixture TV/ })).getAttribute('href')
  ).toContain('fixture=11')
  await act(() => matches(21, [fixture(12, 21)]))
  await act(() =>
    writeFixtureTvRefresh(12, { fetchedAt: Date.now(), listings: [listing(12, 5, 'Liverpool TV')] })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Edit blocks' }))
  await selectOption(await screen.findByLabelText('Team for block 1'), 'Liverpool')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  await screen.findByRole('link', { name: /Liverpool TV/ })
  expect(screen.queryByRole('link', { name: /Next fixture TV/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('link', { name: /Next fixture TV/ })
})

it('adds a linked widget manually and removes dependents in one undoable edit', async () => {
  await saveView('match', {
    ...spec,
    blocks: [
      spec.blocks[0],
      { id: 'calendar', type: 'team-fixtures', teamId: 19, span: 1, period: 'upcoming' }
    ]
  })
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Edit blocks' }))
  await selectOption(
    await screen.findByLabelText('New block'),
    viewBlockTypes.find((item) => item.value === 'fixture-broadcasts')!.label
  )
  expect(screen.getByLabelText('Follow match source').textContent).toContain('Next match · Arsenal')
  fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  await screen.findByRole('link', { name: 'Swedish Sports' })
  fireEvent.click(screen.getByRole('button', { name: 'Edit blocks' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Remove block 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.queryByText('Where to watch')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('link', { name: 'Swedish Sports' })
})

it('keeps loading, request errors, retry and confirmed empty listings distinct', async () => {
  connection.online = true
  await db.fixtureTvQueries.delete(10)
  await writeSubscriptionRefresh({
    plans: [],
    addOns: [],
    resources: [{ id: 142, description: 'Fixtures' }],
    enrichments: [{ id: 96, name: 'TV' }],
    fetchedAt: Date.now()
  })
  let finish!: (value: unknown) => void
  const refresh = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValueOnce({ ok: true, data: { listings: [], fetchedAt: Date.now() } })
  window.halfspace.sportmonks = {
    refreshFixtureTv: refresh
  } as unknown as typeof window.halfspace.sportmonks
  open()
  await screen.findByText('Loading TV listings…')
  await waitFor(() => expect(refresh).toHaveBeenCalledWith({ fixtureId: 10 }))
  await act(async () =>
    finish({ ok: false, error: { code: 'network', message: 'Broadcast request failed.' } })
  )
  await screen.findByText('Broadcast request failed.')
  expect(screen.queryByText('Loading TV listings…')).toBeNull()
  expect(screen.queryByText(/No broadcasts listed/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByText('No broadcasts listed in Sweden for this fixture.')
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
  await waitFor(async () => expect(await db.fixtureTvQueries.get(10)).toBeTruthy())
})

it('shows a plan exclusion without requesting unavailable TV data', async () => {
  connection.online = true
  await db.fixtureTvQueries.delete(10)
  await writeSubscriptionRefresh({
    plans: [],
    addOns: [],
    resources: [],
    enrichments: [],
    fetchedAt: Date.now()
  })
  const refreshFixtureTv = vi.fn()
  window.halfspace.sportmonks = {
    refreshFixtureTv
  } as unknown as typeof window.halfspace.sportmonks
  open()
  await screen.findByText(/TV listings are not included in your Sportmonks plan/)
  expect(screen.queryByText('Loading TV listings…')).toBeNull()
  expect(screen.queryByText(/No broadcasts listed/)).toBeNull()
  expect(refreshFixtureTv).not.toHaveBeenCalled()
})
