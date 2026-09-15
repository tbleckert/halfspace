// @vitest-environment jsdom
import { selectOption } from '../../../test/select-option'
import { viewBlockTypes } from '@/features/views/view-editing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeCompetitionRefresh,
  writeTeamRefresh,
  writeTeamCompetitionsRefresh,
  writeTeamFixtureRefresh,
  writeSeasonTopscorersRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'
import { mockViewsApi } from '../../../test/view-api'
import { saveView } from '@/features/views/saved-views'
import { createStarterView } from '@/features/views/starter-views'
import { makeTopscorer } from '../../../test/topscorer-fixtures'
import { formTrendInput } from '@/features/views/form-trend-data'
import { currentTimeZone, todayInTimeZone } from '@/lib/date'

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

it('changes one widget scope independently, replaces its cached content, and supports undo', async () => {
  for (const [seasonId, playerId, name] of [
    [12, 100, 'Alex Forward'],
    [22, 101, 'Sam Striker']
  ] as const) {
    await writeSeasonTopscorersRefresh(seasonId, {
      fetchedAt: Date.now(),
      pageCount: 1,
      topscorers: [
        makeTopscorer({
          season_id: seasonId,
          player_id: playerId,
          player: { ...makeTopscorer().player!, id: playerId, display_name: name }
        })
      ]
    })
  }
  const router = openViews()
  fireEvent.click(await screen.findByRole('button', { name: 'More starting points' }))
  fireEvent.click(await screen.findByRole('button', { name: /Goals & assists/ }))
  await screen.findByRole('link', { name: 'Alex Forward' })
  fireEvent.click(screen.getByRole('button', { name: 'Edit blocks' }))
  await selectOption(
    await screen.findByLabelText('Competition and season for block 1'),
    'Serie A · 2026/27'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  await screen.findByRole('link', { name: 'Sam Striker' })
  expect(screen.queryByRole('link', { name: 'Alex Forward' })).toBeNull()
  expect((screen.getByLabelText('View name') as HTMLInputElement).value).toBe(
    'Premier League · 2026/27'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('link', { name: 'Alex Forward' })
  expect(screen.queryByRole('link', { name: 'Sam Striker' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(() => expect(router.state.location.search.view).toBeTruthy())
  const saved = await db.savedViews.get(router.state.location.search.view!)
  expect(
    saved?.spec.blocks.every(
      (block) => 'competitionId' in block && block.competitionId === 8 && block.seasonId === 12
    )
  ).toBe(true)
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('duplicates the edited draft, opens its copy, and retains the original saved definition', async () => {
  const spec = createStarterView('leaders', {
    competitionId: 8,
    competitionName: 'Premier League',
    seasonId: 12,
    seasonName: '2026/27',
    isCurrent: true
  })
  await saveView('original', spec)
  const router = openViews()
  await act(() => router.navigate({ to: '/views', search: { view: 'original' } }))
  fireEvent.change(await screen.findByLabelText('View name'), { target: { value: 'My draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate view' }))
  await waitFor(() => expect(router.state.location.search.view).not.toBe('original'))
  await waitFor(() =>
    expect((screen.getByLabelText('View name') as HTMLInputElement).value).toBe('My draft copy')
  )
  expect((await db.savedViews.get('original'))?.spec).toEqual(spec)
  expect(await db.savedViews.count()).toBe(2)
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('opens, saves, and reopens a starter offline without an AI key or generation request', async () => {
  const router = openViews()
  fireEvent.click(await screen.findByRole('button', { name: 'More starting points' }))
  await selectOption(await screen.findByLabelText('Competition and season'), 'Serie A · 2026/27')
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
    saved?.spec.blocks.every(
      (block) => 'competitionId' in block && block.competitionId === 384 && block.seasonId === 22
    )
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
  fireEvent.click(await screen.findByRole('button', { name: 'More starting points' }))
  fireEvent.click(await screen.findByRole('button', { name: /Goals & assists/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit blocks' }))
  await selectOption(
    await screen.findByLabelText('New block'),
    viewBlockTypes.find((item) => item.value === 'recent')!.label
  )
  await selectOption(
    screen.getByLabelText('Competition and season for new block'),
    'Serie A · 2026/27'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
  await selectOption(await screen.findByLabelText('Width of block 1'), '3 columns')
  fireEvent.click(screen.getByRole('button', { name: 'Move block 3 up' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove block 2' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(() => expect(router.state.location.search.view).toBeTruthy())
  const saved = await db.savedViews.get(router.state.location.search.view!)
  expect(saved?.spec.blocks).toMatchObject([
    { type: 'leaders', category: 'goals', span: 3, competitionId: 8, seasonId: 12 },
    { type: 'fixtures', period: 'recent', competitionId: 384, seasonId: 22 },
    { type: 'leaders', category: 'assists', competitionId: 8, seasonId: 12 }
  ])
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('creates a team home offline, changes its widths, saves and reopens after cache clearing', async () => {
  await writeTeamRefresh({
    fetchedAt: Date.now(),
    team: {
      id: 19,
      country_id: 1,
      name: 'Arsenal',
      sport_id: 1,
      venue_id: null,
      gender: 'male',
      founded: 1886,
      placeholder: false,
      sidelined: []
    }
  })
  await writeTeamCompetitionsRefresh(19, {
    teamId: 19,
    fetchedAt: Date.now(),
    pageCount: 1,
    competitions: [(await db.competitions.get(8))!.raw]
  })
  const router = openViews()
  fireEvent.click(await screen.findByRole('button', { name: 'Create team home' }))
  await screen.findByLabelText('Standings & season stats')
  fireEvent.click(screen.getByRole('button', { name: 'Create team home' }))
  expect(((await screen.findByLabelText('View name')) as HTMLInputElement).value).toBe('My Arsenal')
  fireEvent.click(screen.getByRole('button', { name: 'Edit blocks' }))
  await selectOption(await screen.findByLabelText('Width of block 1'), '1 column')
  await selectOption(screen.getByLabelText('Width of block 2'), '2 columns')
  await selectOption(screen.getByLabelText('Width of block 3'), '3 columns')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(() => expect(router.state.location.search.view).toBeTruthy())
  const id = router.state.location.search.view!
  const saved = (await db.savedViews.get(id))!
  expect(saved.spec.blocks.map(({ span }) => span)).toEqual([1, 2, 3, 1, 1, 2, 1, 1])
  expect(
    saved.spec.blocks.every((block) =>
      block.type === 'fixture-broadcasts'
        ? block.fixtureSourceBlockId === 'next-match'
        : 'teamId' in block && block.teamId === 19
    )
  ).toBe(true)
  await act(() => router.navigate({ to: '/views', search: {} }))
  await act(() => clearSportmonksCache())
  await act(() => router.navigate({ to: '/views', search: { view: id } }))
  expect(((await screen.findByLabelText('View name')) as HTMLInputElement).value).toBe('My Arsenal')
  expect((await db.savedViews.get(id))?.spec).toEqual(saved.spec)
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('filters a cached form sample, undoes the filter, and saves and duplicates it without AI', async () => {
  const timeZone = currentTimeZone()
  const today = todayInTimeZone(timeZone)
  await writeTeamFixtureRefresh(formTrendInput(19, today, timeZone), {
    timeZone,
    fetchedAt: Date.now(),
    pageCount: 1,
    fixtures: [
      {
        id: 100,
        league_id: 8,
        season_id: 12,
        state_id: 5,
        starting_at_timestamp: (Date.now() - 86400000) / 1000,
        placeholder: false,
        has_odds: false,
        participants: [
          { id: 19, name: 'Arsenal', meta: { location: 'home' } },
          { id: 20, name: 'Chelsea', meta: { location: 'away' } }
        ],
        scores: [
          {
            id: 1,
            participant_id: 19,
            description: 'CURRENT',
            score: { goals: 2, participant: 'home' }
          },
          {
            id: 2,
            participant_id: 20,
            description: 'CURRENT',
            score: { goals: 0, participant: 'away' }
          }
        ]
      }
    ]
  })
  await saveView('form', {
    version: 3,
    title: 'My form',
    message: '',
    blocks: [{ id: 'trend', type: 'form-trend', teamId: 19, span: 2, matchLocation: 'all' }]
  })
  const router = openViews()
  await act(() => router.navigate({ to: '/views', search: { view: 'form' } }))
  const result = await screen.findByRole('link', { name: /Win home to Chelsea/ })
  expect(result.getAttribute('href')).toContain('season=12')
  await selectOption(screen.getByLabelText('Form match location'), 'Away')
  await screen.findByText('No completed away matches reported in this window.')
  expect(screen.queryByRole('link', { name: /Win home to Chelsea/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  await screen.findByRole('link', { name: /Win home to Chelsea/ })
  await selectOption(screen.getByLabelText('Form match location'), 'Home')
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('form'))?.spec.blocks[0]).toMatchObject({
      matchLocation: 'home',
      span: 2
    })
  )
  await act(() => router.navigate({ to: '/views', search: {} }))
  await act(() => router.navigate({ to: '/views', search: { view: 'form' } }))
  await screen.findByRole('link', { name: /Win home to Chelsea/ })
  expect(screen.getByLabelText('Form match location').textContent).toContain('Home')
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate view' }))
  await waitFor(() => expect(router.state.location.search.view).not.toBe('form'))
  expect(
    (await db.savedViews.get(router.state.location.search.view!))?.spec.blocks[0]
  ).toMatchObject({ type: 'form-trend', matchLocation: 'home', span: 2 })
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})

it('adds beyond eight widgets, undoes an edit, and saves and reopens all column modes', async () => {
  const starter = createStarterView('leaders', {
    competitionId: 8,
    competitionName: 'Premier League',
    seasonId: 12,
    seasonName: '2026/27',
    isCurrent: true
  })
  await saveView('large', {
    ...starter,
    blocks: Array.from({ length: 8 }, (_, index) => ({
      ...starter.blocks[0],
      id: `block-${index}`
    }))
  })
  const router = openViews()
  await act(() => router.navigate({ to: '/views', search: { view: 'large' } }))
  fireEvent.click(await screen.findByRole('button', { name: 'Edit blocks' }))
  await selectOption(
    await screen.findByLabelText('New block'),
    viewBlockTypes.find((item) => item.value === 'standings')!.label
  )
  for (let count = 9; count <= 12; count++) {
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
    await screen.findByLabelText(`Width of block ${count}`)
  }
  for (const [index, span] of [
    [10, 1],
    [11, 2],
    [12, 3]
  ]) {
    await selectOption(
      screen.getByLabelText(`Width of block ${index}`),
      `${span} ${span === 1 ? 'column' : 'columns'}`
    )
  }
  fireEvent.click(screen.getByRole('button', { name: 'Remove block 12' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Undo change' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  await waitFor(async () =>
    expect((await db.savedViews.get('large'))?.spec.blocks).toHaveLength(12)
  )
  const saved = (await db.savedViews.get('large'))!.spec
  expect(saved.blocks.slice(-3).map(({ span }) => span)).toEqual([1, 2, 3])
  await act(() => router.navigate({ to: '/views', search: {} }))
  await act(() => router.navigate({ to: '/views', search: { view: 'large' } }))
  fireEvent.click(await screen.findByRole('button', { name: 'Edit blocks' }))
  expect((await screen.findByLabelText('Width of block 12')).textContent).toContain('3 columns')
  expect((await db.savedViews.get('large'))?.spec).toEqual(saved)
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})
