// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Result, TeamRefresh } from '@shared/contracts'
import { db, readTeamIdentity } from '@/data/db'
import { invalidateTeamRefreshes, refreshTeamEntity } from './use-team'

beforeEach(async () => {
  invalidateTeamRefreshes()
  if (!db.isOpen()) await db.open()
  await db.teams.clear()
})

afterAll(() => db.close())

describe('team refresh', () => {
  it('does not restore an old team after the credential changes', async () => {
    const oldRequest = deferred<Result<TeamRefresh>>()
    const newRequest = deferred<Result<TeamRefresh>>()
    const refreshTeam = vi
      .fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    window.halfspace = {
      credentials: {
        getConnectionState: vi.fn(),
        saveToken: vi.fn(),
        clearToken: vi.fn()
      },
      sportmonks: {
        refreshFixtures: vi.fn(),
        refreshCompetitions: vi.fn(),
        refreshStandings: vi.fn(),
        refreshCompetitionFixtures: vi.fn(),
        refreshTeam,
        refreshTeamFixtures: vi.fn(),
        refreshTeamSquad: vi.fn(),
        refreshVenue: vi.fn(),
        refreshPlayer: vi.fn(),
        refreshPlayerAppearances: vi.fn()
      }
    }

    const oldRefresh = refreshTeamEntity(9)
    invalidateTeamRefreshes()
    const newRefresh = refreshTeamEntity(9)

    newRequest.resolve({ ok: true, data: teamRefresh('Manchester City') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: teamRefresh('Old Manchester City') })
    await oldRefresh

    expect((await readTeamIdentity(9)).team?.name).toBe('Manchester City')
  })
})

function teamRefresh(name: string): TeamRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    team: {
      id: 9,
      sport_id: 1,
      country_id: 462,
      venue_id: 206,
      gender: 'male',
      name,
      founded: 1880,
      placeholder: false
    }
  }
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}
