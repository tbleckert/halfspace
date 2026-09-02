import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { ConnectionState, SportmonksRateLimit } from '@shared/contracts'
import { clearSportmonksCache } from '@/data/db'
import { invalidateCompetitionRefresh } from '@/features/competitions/use-competitions'
import { invalidateScheduleRefreshes } from '@/features/competitions/use-season-schedule'
import { invalidateCoachRefreshes } from '@/features/coaches/use-coach'
import { invalidateRefereeRefreshes } from '@/features/referees/use-referee'
import { invalidateCompetitionWorkspaceRefreshes } from '@/features/competitions/use-competition-workspace'
import { invalidateFixtureRefreshes } from '@/features/fixtures/use-fixtures'
import { invalidateCommentaryRefreshes } from '@/features/fixtures/use-commentary'
import { invalidatePlayerRefreshes } from '@/features/players/use-player'
import { invalidateTeamRefreshes } from '@/features/teams/use-team'
import { invalidateRivalRefreshes } from '@/features/teams/use-team-rivals'
import { invalidateVenueRefreshes } from '@/features/venues/use-venue'
import { ConnectionStateContext } from './connection-state-context'

export function ConnectionStateProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [connection, setConnection] = useState<ConnectionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<SportmonksRateLimit | null>(null)

  const reload = useCallback(async () => {
    setError(null)

    try {
      setConnection(await window.halfspace.credentials.getConnectionState())
    } catch {
      setError('Could not access the stored Sportmonks token.')
    }
  }, [])

  const saveToken = useCallback(async (token: string) => {
    try {
      const result = await window.halfspace.credentials.saveToken({ token })

      if (result.ok) {
        invalidateCompetitionRefresh()
        invalidateScheduleRefreshes()
        invalidateCoachRefreshes()
        invalidateRefereeRefreshes()
        invalidateCompetitionWorkspaceRefreshes()
        invalidateFixtureRefreshes()
        invalidateCommentaryRefreshes()
        invalidatePlayerRefreshes()
        invalidateTeamRefreshes()
        invalidateRivalRefreshes()
        invalidateVenueRefreshes()
        await clearSportmonksCache().catch(() => undefined)
        setConnection(result.data)
        setError(null)
        setRateLimit(null)
      }

      return result
    } catch {
      return {
        ok: false as const,
        error: { code: 'storage' as const, message: 'Could not save the token.' }
      }
    }
  }, [])

  const clearToken = useCallback(async () => {
    try {
      const result = await window.halfspace.credentials.clearToken()

      if (result.ok) {
        invalidateCompetitionRefresh()
        invalidateScheduleRefreshes()
        invalidateCoachRefreshes()
        invalidateRefereeRefreshes()
        invalidateCompetitionWorkspaceRefreshes()
        invalidateFixtureRefreshes()
        invalidateCommentaryRefreshes()
        invalidatePlayerRefreshes()
        invalidateTeamRefreshes()
        invalidateRivalRefreshes()
        invalidateVenueRefreshes()
        await clearSportmonksCache().catch(() => undefined)
        setConnection({ configured: false })
        setError(null)
        setRateLimit(null)
      }

      return result
    } catch {
      return {
        ok: false as const,
        error: { code: 'storage' as const, message: 'Could not remove the token.' }
      }
    }
  }, [])

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
    const unsubscribe = window.halfspace.sportmonks.onRateLimitChange(setRateLimit)

    void window.halfspace.sportmonks
      .getRateLimit()
      .then((current) => {
        if (active && current) setRateLimit(current)
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
      {children}
    </ConnectionStateContext.Provider>
  )
}
