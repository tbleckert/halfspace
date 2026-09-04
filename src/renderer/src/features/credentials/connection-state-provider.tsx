import { invalidateCompetitionDetailRefreshes } from '@/features/competitions/use-competition-detail'
import { invalidateSeasonTeamsRefreshes } from '@/features/competitions/use-season-teams'
import { invalidateTeamCompetitionsRefreshes } from '@/features/teams/use-team-competitions'
import { invalidateLiveStandingsRefreshes } from '@/features/competitions/use-live-standings'
import { invalidateTrendsRefreshes } from '@/features/fixtures/use-trends'
import { invalidateBroadcasterRefreshes } from '@/features/broadcasts/use-broadcaster'
import { invalidateBroadcastScheduleRefreshes } from '@/features/broadcasts/use-broadcast-schedule'
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { ConnectionState, SportmonksRateLimit } from '@shared/contracts'
import { clearSportmonksCache } from '@/data/db'
import { invalidateCompetitionRefresh } from '@/features/competitions/use-competitions'
import { invalidateScheduleRefreshes } from '@/features/competitions/use-season-schedule'
import { invalidateBracketRefreshes } from '@/features/competitions/use-season-bracket'
import { invalidateRoundStandingsRefreshes } from '@/features/competitions/use-round-standings'
import { invalidateTransferFeedRefreshes } from '@/features/transfers/use-transfer-feed'
import { invalidateCoachRefreshes } from '@/features/coaches/use-coach'
import { invalidateRefereeRefreshes } from '@/features/referees/use-referee'
import { invalidateCompetitionWorkspaceRefreshes } from '@/features/competitions/use-competition-workspace'
import { invalidateFixtureRefreshes } from '@/features/fixtures/use-fixtures'
import { invalidateCommentaryRefreshes } from '@/features/fixtures/use-commentary'
import { invalidatePressureRefreshes } from '@/features/fixtures/use-pressure'
import { invalidatePlayerRefreshes } from '@/features/players/use-player'
import { invalidateTeamRefreshes } from '@/features/teams/use-team'
import { invalidateRivalRefreshes } from '@/features/teams/use-team-rivals'
import { invalidateVenueRefreshes } from '@/features/venues/use-venue'
import { invalidateSearchRefreshes } from '@/features/search/use-entity-search'
import { ConnectionStateContext } from './connection-state-context'
import { invalidateSubscriptionRefresh } from '@/features/subscription/use-subscription'
import { invalidateFixtureTvRefreshes } from '@/features/fixtures/use-fixture-tv'
import { invalidatePredictedLineupsRefreshes } from '@/features/fixtures/use-predicted-lineups'
import { invalidateNewsRefreshes } from '@/features/news/use-news'
import { invalidateHonoursRefreshes } from '@/features/honours/use-honours'
import { invalidateMatchFactsRefreshes } from '@/features/fixtures/use-match-facts'
import { invalidateTeamOfWeekRefreshes } from '@/features/competitions/use-team-of-week'
import { invalidateStatisticSeasonRefreshes } from '@/features/comparisons/use-statistic-seasons'

export function ConnectionStateProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [connection, setConnection] = useState<ConnectionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<SportmonksRateLimit | null>(null)
  const [workspaceVersion, setWorkspaceVersion] = useState(0)
  const cacheResetPending = useRef(false)

  const reload = useCallback(async () => {
    setError(null)

    try {
      if (cacheResetPending.current) {
        await clearSportmonksCache()
        cacheResetPending.current = false
      }
      setConnection(await window.halfspace.credentials.getConnectionState())
    } catch {
      setError(
        cacheResetPending.current
          ? 'Could not reset cached football data.'
          : 'Could not access the stored Sportmonks token.'
      )
    }
  }, [])

  const resetConnection = useCallback(async (nextConnection: ConnectionState) => {
    invalidateRefreshes()
    cacheResetPending.current = true
    setConnection(null)
    setError(null)
    setRateLimit(null)
    setWorkspaceVersion((version) => version + 1)

    try {
      await clearSportmonksCache()
      cacheResetPending.current = false
      setConnection(nextConnection)
      return true
    } catch {
      setError('Could not reset cached football data.')
      return false
    }
  }, [])

  const saveToken = useCallback(
    async (token: string) => {
      try {
        const result = await window.halfspace.credentials.saveToken({ token })

        if (result.ok && !(await resetConnection(result.data))) {
          return {
            ok: false as const,
            error: {
              code: 'storage' as const,
              message: 'Token saved, but cached football data could not be reset.'
            }
          }
        }

        return result
      } catch {
        return {
          ok: false as const,
          error: { code: 'storage' as const, message: 'Could not save the token.' }
        }
      }
    },
    [resetConnection]
  )

  const clearToken = useCallback(async () => {
    try {
      const result = await window.halfspace.credentials.clearToken()

      if (result.ok && !(await resetConnection({ configured: false }))) {
        return {
          ok: false as const,
          error: {
            code: 'storage' as const,
            message: 'Token removed, but cached football data could not be reset.'
          }
        }
      }

      return result
    } catch {
      return {
        ok: false as const,
        error: { code: 'storage' as const, message: 'Could not remove the token.' }
      }
    }
  }, [resetConnection])

  useEffect(() => {
    let active = true

    void window.halfspace.credentials
      .getConnectionState()
      .then((state) => {
        if (active) {
          setConnection(state)
          setError(null)
        }
      })
      .catch(() => {
        if (active) setError('Could not access the stored Sportmonks token.')
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    let snapshotCurrent = true
    const unsubscribe = window.halfspace.sportmonks.onRateLimitChange((current) => {
      snapshotCurrent = false
      setRateLimit(current)
    })

    void window.halfspace.sportmonks
      .getRateLimit()
      .then((current) => {
        if (active && snapshotCurrent) setRateLimit(current)
      })
      .catch(() => undefined)

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!rateLimit) return

    const timeout = window.setTimeout(
      () => setRateLimit(null),
      Math.max(0, rateLimit.resetsAt - Date.now())
    )
    return () => window.clearTimeout(timeout)
  }, [rateLimit])

  return (
    <ConnectionStateContext.Provider
      value={{ connection, error, rateLimit, clearToken, reload, saveToken }}
    >
      <Fragment key={workspaceVersion}>{children}</Fragment>
    </ConnectionStateContext.Provider>
  )
}

function invalidateRefreshes(): void {
  invalidateLiveStandingsRefreshes()
  invalidateTrendsRefreshes()
  invalidateBroadcasterRefreshes()
  invalidateBroadcastScheduleRefreshes()
  invalidateBracketRefreshes()
  invalidatePredictedLineupsRefreshes()
  invalidateNewsRefreshes()
  invalidateHonoursRefreshes()
  invalidateMatchFactsRefreshes()
  invalidateStatisticSeasonRefreshes()
  invalidateSubscriptionRefresh()
  invalidateFixtureTvRefreshes()
  invalidateTeamOfWeekRefreshes()
  invalidateCompetitionRefresh()
  invalidateScheduleRefreshes()
  invalidateRoundStandingsRefreshes()
  invalidateTransferFeedRefreshes()
  invalidateCoachRefreshes()
  invalidateRefereeRefreshes()
  invalidateCompetitionWorkspaceRefreshes()
  invalidateFixtureRefreshes()
  invalidateCommentaryRefreshes()
  invalidatePressureRefreshes()
  invalidatePlayerRefreshes()
  invalidateTeamRefreshes()
  invalidateRivalRefreshes()
  invalidateCompetitionDetailRefreshes()
  invalidateSeasonTeamsRefreshes()
  invalidateTeamCompetitionsRefreshes()
  invalidateVenueRefreshes()
  invalidateSearchRefreshes()
}
