import { useEffect } from 'react'

export interface RefreshRequest {
  generation: number
  promise: Promise<void>
}

export interface RefreshableQuery<T> {
  cached: T | undefined
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useStaleRefresh(
  enabled: boolean,
  cacheLoaded: boolean,
  staleAt: number | undefined,
  refresh: () => Promise<void>
): void {
  useEffect(() => {
    if (!enabled || !cacheLoaded) return

    const delay = staleAt ? Math.max(0, staleAt - Date.now()) : 0
    const timeout = window.setTimeout(() => void refresh(), delay)

    return () => window.clearTimeout(timeout)
  }, [cacheLoaded, enabled, refresh, staleAt])
}
