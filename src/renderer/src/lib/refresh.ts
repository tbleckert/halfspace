import { useEffect } from 'react'

const retryDelay = 30_000

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

    let cancelled = false
    let refreshing = false
    let nextAttemptAt = 0
    let timeout: number | undefined

    function schedule(): void {
      window.clearTimeout(timeout)
      if (cancelled || refreshing || !navigator.onLine || document.visibilityState === 'hidden')
        return

      const delay = Math.max(0, (staleAt ?? 0) - Date.now(), nextAttemptAt - Date.now())
      timeout = window.setTimeout(run, delay)
    }

    function run(): void {
      if (cancelled || refreshing || !navigator.onLine || document.visibilityState === 'hidden')
        return
      refreshing = true

      // The query owns error reporting. Keep stale data and retry without a navigation.
      void refresh()
        .catch(() => undefined)
        .finally(() => {
          refreshing = false
          nextAttemptAt = Date.now() + retryDelay
          schedule()
        })
    }

    schedule()
    window.addEventListener('focus', schedule)
    window.addEventListener('online', schedule)
    window.addEventListener('offline', schedule)
    document.addEventListener('visibilitychange', schedule)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      window.removeEventListener('focus', schedule)
      window.removeEventListener('online', schedule)
      window.removeEventListener('offline', schedule)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [cacheLoaded, enabled, refresh, staleAt])
}
