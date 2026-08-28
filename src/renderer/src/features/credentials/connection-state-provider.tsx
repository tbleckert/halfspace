import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { ConnectionState } from '@shared/contracts'
import { clearSportmonksCache } from '@/data/db'
import { invalidateCompetitionRefresh } from '@/features/competitions/use-competitions'
import { invalidateCompetitionWorkspaceRefreshes } from '@/features/competitions/use-competition-workspace'
import { invalidateFixtureRefreshes } from '@/features/fixtures/use-fixtures'
import { ConnectionStateContext } from './connection-state-context'

export function ConnectionStateProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [connection, setConnection] = useState<ConnectionState | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        invalidateCompetitionWorkspaceRefreshes()
        invalidateFixtureRefreshes()
        await clearSportmonksCache().catch(() => undefined)
        setConnection(result.data)
        setError(null)
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
        invalidateCompetitionWorkspaceRefreshes()
        invalidateFixtureRefreshes()
        await clearSportmonksCache().catch(() => undefined)
        setConnection({ configured: false })
        setError(null)
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

  return (
    <ConnectionStateContext.Provider value={{ connection, error, clearToken, reload, saveToken }}>
      {children}
    </ConnectionStateContext.Provider>
  )
}
