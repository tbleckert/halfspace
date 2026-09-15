// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { mockViewsApi } from '../../../../test/view-api'
import type { Result } from '@shared/contracts'
import type { GenerateViewInput, ViewProgress, ViewSpec } from '@shared/views'
import { clearSportmonksCache } from '@/data/db'
import { invalidateTeamSeasonsRefreshes } from '@/features/teams/use-team-seasons'
import type { TeamSeasonsRefresh } from '@shared/discovery'
import { useViewGeneration } from './use-view-generation'

const spec: ViewSpec = {
  version: 3,
  title: 'Premier League',
  message: '',
  blocks: [
    { id: 'table', type: 'standings', teamId: null, competitionId: 8, seasonId: 12, span: 1 }
  ]
}
const contexts = [
  {
    competitionId: 8,
    competitionName: 'Premier League',
    seasonId: 12,
    seasonName: '2026/27',
    isCurrent: true
  }
]
let progress: (update: ViewProgress) => void
let input: GenerateViewInput
let complete: (result: Result<ViewSpec>) => void

beforeEach(() => {
  const views = mockViewsApi()
  views.onProgress = (listener) => {
    progress = listener
    return vi.fn()
  }
  views.generate = vi.fn((value: GenerateViewInput) => {
    input = value
    return new Promise<Result<ViewSpec>>((resolve) => {
      complete = resolve
    })
  })
  window.halfspace = { views } as typeof window.halfspace
})

it('ignores late progress and completion after the user stops generation', async () => {
  const { result } = renderHook(useViewGeneration)
  let task: Promise<ViewSpec | null>
  act(() => {
    task = result.current.generate('Show a table', contexts, spec)
  })
  act(() => progress({ requestId: input.requestId, blocks: spec.blocks }))
  expect(result.current.blocks).toHaveLength(1)
  act(() => result.current.cancel())
  act(() => progress({ requestId: input.requestId, blocks: spec.blocks }))
  await act(async () => {
    complete({ ok: true, data: spec })
    expect(await task!).toBeNull()
  })
  expect(result.current.blocks).toEqual([])
  expect(result.current.generating).toBe(false)
  expect(window.halfspace.views.cancel).toHaveBeenCalledWith(input.requestId)
})

it('preserves the previous view when an edit is unsupported', async () => {
  const { result } = renderHook(useViewGeneration)
  let task: Promise<ViewSpec | null>
  act(() => {
    task = result.current.generate('Add a custom radar', contexts, spec)
  })
  await act(async () => {
    complete({
      ok: true,
      data: { ...spec, blocks: [], message: 'Custom radars are not available yet.' }
    })
    expect(await task!).toBeNull()
  })
  expect(result.current.error).toBe('Custom radars are not available yet.')
  expect(input.current).toEqual(spec)
})

it('cancels the main-process request when the editor unmounts', () => {
  const { result, unmount } = renderHook(useViewGeneration)
  act(() => {
    void result.current.generate('Show a table', contexts, null)
  })
  unmount()
  expect(window.halfspace.views.cancel).toHaveBeenCalledWith(input.requestId)
})

it('resolves a named historical season before generation and validates the exact returned scope', async () => {
  await clearSportmonksCache()
  const season = { id: 15, league_id: 384, name: '2015/2016', is_current: false }
  window.halfspace.sportmonks = {
    refreshTeamSeasons: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        teamId: 625,
        fetchedAt: Date.now(),
        seasons: [{ ...season, league: { id: 384, name: 'Serie A', active: true, country_id: 1 } }]
      }
    })
  } as unknown as typeof window.halfspace.sportmonks
  const historical: ViewSpec = {
    version: 3,
    title: 'Juventus 2015/16',
    message: '',
    blocks: [
      {
        id: 'results',
        type: 'team-season-results',
        teamId: 625,
        competitionId: 384,
        seasonId: 15,
        span: 2
      }
    ]
  }
  const { result } = renderHook(useViewGeneration)
  let task: Promise<ViewSpec | null>
  act(() => {
    task = result.current.generate(
      'My favorite Juventus season is 2015/16. Make a view I can watch when I am down.',
      contexts,
      null,
      [{ teamId: 625, teamName: 'Juventus' }]
    )
  })
  await waitFor(() => expect(window.halfspace.views.generate).toHaveBeenCalledOnce())
  expect(input.contexts[0]).toMatchObject({
    competitionId: 384,
    seasonId: 15,
    seasonName: '2015/2016'
  })
  await act(async () => {
    complete({ ok: true, data: historical })
    expect(await task!).toEqual(historical)
  })
})

it('does not start AI after a cancelled historical metadata lookup finishes', async () => {
  invalidateTeamSeasonsRefreshes()
  await clearSportmonksCache()
  let resolveLookup!: (result: Result<TeamSeasonsRefresh>) => void
  const refreshTeamSeasons = vi.fn(
    () =>
      new Promise<Result<TeamSeasonsRefresh>>((resolve) => {
        resolveLookup = resolve
      })
  )
  window.halfspace.sportmonks = {
    refreshTeamSeasons
  } as unknown as typeof window.halfspace.sportmonks
  const { result } = renderHook(useViewGeneration)
  let task: Promise<ViewSpec | null>
  act(() => {
    task = result.current.generate('Juventus 2015/16', contexts, null, [
      { teamId: 625, teamName: 'Juventus' }
    ])
  })
  await waitFor(() => expect(refreshTeamSeasons).toHaveBeenCalledOnce())
  act(() => result.current.cancel())
  await act(async () => {
    resolveLookup({ ok: true, data: { teamId: 625, seasons: [], fetchedAt: Date.now() } })
    expect(await task!).toBeNull()
  })
  expect(window.halfspace.views.generate).not.toHaveBeenCalled()
})
