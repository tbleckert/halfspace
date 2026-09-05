// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clearSportmonksCache, db } from '@/data/db'
import {
  readSeasonReferees,
  readSeasonVenues,
  readStandingCorrections,
  readTeamSchedule
} from '@/data/season-resources-cache'
import { readTransferRumours } from '@/data/transfer-rumours-cache'
import { refreshSeasonReferees, invalidateSeasonRefereesRefreshes } from './use-season-referees'
import { refreshSeasonVenues, invalidateSeasonVenuesRefreshes } from './use-season-venues'
import {
  refreshStandingCorrections,
  invalidateStandingCorrectionsRefreshes
} from './use-standing-corrections'
import {
  refreshTeamSchedule,
  invalidateTeamScheduleRefreshes
} from '@/features/teams/use-team-schedule'
import {
  refreshTransferRumours,
  invalidateTransferRumoursRefreshes
} from '@/features/transfers/use-transfer-rumours'

const teamInput = { teamId: 4, seasonId: 12 }
const rumourInput = { entity: 'teams' as const, entityId: 4, page: 1 }
const cases = [
  {
    api: 'refreshSeasonReferees',
    refresh: () => refreshSeasonReferees(12),
    invalidate: invalidateSeasonRefereesRefreshes,
    read: () => readSeasonReferees(12),
    data: { seasonId: 12, referees: [], fetchedAt: 1 }
  },
  {
    api: 'refreshSeasonVenues',
    refresh: () => refreshSeasonVenues(12),
    invalidate: invalidateSeasonVenuesRefreshes,
    read: () => readSeasonVenues(12),
    data: { seasonId: 12, venues: [], fetchedAt: 1 }
  },
  {
    api: 'refreshStandingCorrections',
    refresh: () => refreshStandingCorrections(12),
    invalidate: invalidateStandingCorrectionsRefreshes,
    read: () => readStandingCorrections(12),
    data: { seasonId: 12, corrections: [], fetchedAt: 1 }
  },
  {
    api: 'refreshTeamSchedule',
    refresh: () => refreshTeamSchedule(teamInput),
    invalidate: invalidateTeamScheduleRefreshes,
    read: () => readTeamSchedule(teamInput),
    data: { ...teamInput, stages: [], fetchedAt: 1 }
  },
  {
    api: 'refreshTransferRumours',
    refresh: () => refreshTransferRumours(rumourInput),
    invalidate: invalidateTransferRumoursRefreshes,
    read: () => readTransferRumours(rumourInput),
    data: { ...rumourInput, rumours: [], hasMore: false, fetchedAt: 1 }
  }
]
beforeEach(async () => {
  cases.forEach(({ invalidate }) => invalidate())
  await clearSportmonksCache()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(() => db.close())

it.each(cases)(
  '$api does not repopulate the cache after credentials change',
  async ({ api, refresh, invalidate, read, data }) => {
    let resolve!: (value: unknown) => void
    const request = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    vi.stubGlobal('halfspace', { sportmonks: { [api]: request } })
    const first = refresh()
    const second = refresh()
    expect(request).toHaveBeenCalledOnce()
    invalidate()
    resolve({ ok: true, data })
    await Promise.all([first, second])
    expect(await read()).toBeNull()
  }
)
