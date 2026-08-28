// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Result, VenueRefresh } from '@shared/contracts'
import { db, readVenueIdentity } from '@/data/db'
import { invalidateVenueRefreshes, refreshVenueEntity } from './use-venue'

beforeEach(async () => {
  invalidateVenueRefreshes()
  if (!db.isOpen()) await db.open()
  await db.venues.clear()
})

afterAll(() => db.close())

describe('venue refresh', () => {
  it('does not restore an old venue after the credential changes', async () => {
    const oldRequest = deferred<Result<VenueRefresh>>()
    const newRequest = deferred<Result<VenueRefresh>>()
    const refreshVenue = vi
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
        refreshTeam: vi.fn(),
        refreshTeamFixtures: vi.fn(),
        refreshVenue
      }
    }

    const oldRefresh = refreshVenueEntity(206)
    invalidateVenueRefreshes()
    const newRefresh = refreshVenueEntity(206)

    newRequest.resolve({ ok: true, data: venueRefresh('Etihad Stadium') })
    await newRefresh

    oldRequest.resolve({ ok: true, data: venueRefresh('Old Etihad Stadium') })
    await oldRefresh

    expect((await readVenueIdentity(206)).venue?.name).toBe('Etihad Stadium')
  })
})

function venueRefresh(name: string): VenueRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    venue: {
      id: 206,
      country_id: 462,
      name,
      capacity: 55097
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
