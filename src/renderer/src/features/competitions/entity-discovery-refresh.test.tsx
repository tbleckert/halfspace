// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readCompetitionDetail,
  readSeasonTeams,
  readTeamCompetitions
} from '@/data/db'
import {
  invalidateCompetitionDetailRefreshes,
  refreshCompetitionDetail,
  useCompetitionDetail
} from './use-competition-detail'
import {
  invalidateSeasonTeamsRefreshes,
  refreshSeasonTeams,
  useSeasonTeams
} from './use-season-teams'
import {
  invalidateTeamCompetitionsRefreshes,
  refreshTeamCompetitions,
  useTeamCompetitions
} from '@/features/teams/use-team-competitions'

const cases = [
  {
    name: 'competition',
    api: 'refreshCompetition',
    refresh: refreshCompetitionDetail,
    invalidate: invalidateCompetitionDetailRefreshes,
    useQuery: useCompetitionDetail,
    read: readCompetitionDetail,
    data: (id: number) => ({
      competition: { id, country_id: 1, name: `Competition ${id}`, active: true },
      fetchedAt: Date.now()
    })
  },
  {
    name: 'season teams',
    api: 'refreshSeasonTeams',
    refresh: refreshSeasonTeams,
    invalidate: invalidateSeasonTeamsRefreshes,
    useQuery: useSeasonTeams,
    read: readSeasonTeams,
    data: (id: number) => ({ seasonId: id, teams: [], fetchedAt: Date.now(), pageCount: 1 })
  },
  {
    name: 'team competitions',
    api: 'refreshTeamCompetitions',
    refresh: refreshTeamCompetitions,
    invalidate: invalidateTeamCompetitionsRefreshes,
    useQuery: useTeamCompetitions,
    read: readTeamCompetitions,
    data: (id: number) => ({ teamId: id, competitions: [], fetchedAt: Date.now(), pageCount: 1 })
  }
]

beforeEach(async () => {
  cases.forEach(({ invalidate }) => invalidate())
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

describe.each(cases)('$name refresh', ({ api, refresh, invalidate, data, read, useQuery }) => {
  it('deduplicates requests and rejects old credentials', async () => {
    let resolve!: (value: unknown) => void
    const request = vi.fn().mockReturnValue(
      new Promise((done) => {
        resolve = done
      })
    )
    vi.stubGlobal('halfspace', { sportmonks: { [api]: request } })
    const before = await read(1)
    const first = refresh(1)
    const second = refresh(1)
    expect(request).toHaveBeenCalledOnce()
    invalidate()
    resolve({ ok: true, data: data(1) })
    await Promise.all([first, second])
    expect(await read(1)).toEqual(before)
  })

  it('shows cached data offline, clears it on identity changes, and avoids fetching while disabled', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, data: data(1) })
    vi.stubGlobal('halfspace', { sportmonks: { [api]: request } })
    await refresh(1)
    const { result, rerender } = renderHook(({ id }) => useQuery(id, false), {
      initialProps: { id: 1 }
    })
    await waitFor(() => expect(result.current.cached).toEqual(expect.objectContaining({})))
    rerender({ id: 2 })
    expect(result.current.cached).toBeUndefined()
    await waitFor(() =>
      expect(result.current.cached).toEqual(
        api === 'refreshCompetition' ? { competition: null, query: null } : null
      )
    )
    expect(request).toHaveBeenCalledOnce()
  })

  it('does not expose an earlier query failure after navigation', async () => {
    let reject!: (reason: Error) => void
    const request = vi.fn().mockReturnValue(
      new Promise((_, fail) => {
        reject = fail
      })
    )
    vi.stubGlobal('halfspace', { sportmonks: { [api]: request } })
    const { result, rerender } = renderHook(({ id }) => useQuery(id, true), {
      initialProps: { id: 1 }
    })
    let pending!: Promise<void>
    act(() => {
      pending = result.current.refresh()
    })
    rerender({ id: 2 })
    await act(async () => {
      reject(new Error('Old request failed'))
      await pending
    })
    expect(result.current.error).toBeNull()
    expect(result.current.refreshing).toBe(false)
  })
})
