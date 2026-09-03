// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  writeFixtureCommentaryRefresh,
  writeFixtureDetailRefresh
} from '@/data/db'
import { routeTree } from '@/routeTree.gen'

const scenario = vi.hoisted(() => ({ chooseCommentaryOnMount: false }))
vi.mock('@/features/fixtures/fixture-game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/fixtures/fixture-game')>()
  const { useLayoutEffect, createElement } = await import('react')
  return {
    FixtureGame: (props: React.ComponentProps<typeof actual.FixtureGame>) => {
      useLayoutEffect(() => {
        if (scenario.chooseCommentaryOnMount) {
          scenario.chooseCommentaryOnMount = false
          screen.getByRole('link', { name: 'Commentary' }).click()
        }
      }, [])
      return createElement(actual.FixtureGame, props)
    }
  }
})

vi.mock('@/components/app-shell', async () => ({
  AppShell: (await import('@tanstack/react-router')).Outlet
}))
vi.mock('@/features/credentials/connection-state-provider', () => ({
  ConnectionStateProvider: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/use-online', () => ({ useOnline: () => false }))
beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it.each([false, true])(
  'keeps explicit commentary navigation, including during the initial render (%s)',
  async (duringInitialRender) => {
    scenario.chooseCommentaryOnMount = duringInitialRender
    const fetchedAt = Date.now()
    await writeFixtureDetailRefresh({
      fetchedAt,
      fixture: {
        id: 50,
        league_id: 8,
        season_id: 12,
        state_id: 5,
        placeholder: false,
        has_odds: false,
        participants: [],
        scores: []
      }
    })
    const comment = {
      fixture_id: 50,
      minute: 90,
      extra_minute: 3,
      is_goal: false,
      is_important: false
    }
    await writeFixtureCommentaryRefresh(50, {
      fetchedAt,
      commentaries: [
        { ...comment, id: 1, comment: 'A late chance.', order: 1 },
        { ...comment, id: 2, comment: 'Goal!', is_goal: true, order: 2 },
        { ...comment, id: 3, comment: 'Full time.', minute: null, order: 3 }
      ]
    })
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/fixtures/50?competition=8&season=12'] })
    })
    render(<RouterProvider router={router} />)
    if (!duringInitialRender)
      fireEvent.click(await screen.findByRole('link', { name: 'Commentary' }))
    const list = await screen.findByRole('list', { name: 'Commentary, newest first' })
    expect(within(list).getAllByRole('listitem')[0].textContent).toContain('Full time.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Commentary filter' }), {
      target: { value: 'key' }
    })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('90+3′')).toBeTruthy()
    expect(router.state.location.search).toMatchObject({ competition: 8, season: 12 })
  }
)
