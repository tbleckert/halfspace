import { useCallback, useMemo, useState } from 'react'

type QueryKey = string | number | null | undefined

interface RefreshState {
  scope: { queryKey: QueryKey }
  request: symbol
  refreshing: boolean
  error: string | null
}

export function useRefreshStatus(queryKey: QueryKey): {
  refreshing: boolean
  error: string | null
  runRefresh: (request: () => Promise<void>, fallbackError: string) => Promise<void>
} {
  // Returning to the same key is a new visit, not a continuation of its old request.
  const scope = useMemo(() => ({ queryKey }), [queryKey])
  const [state, setState] = useState<RefreshState | null>(null)

  const runRefresh = useCallback(
    async (request: () => Promise<void>, fallbackError: string) => {
      const requestId = Symbol('refresh')
      setState({ scope, request: requestId, refreshing: true, error: null })

      let error: string | null = null
      try {
        await request()
      } catch (refreshError) {
        error = refreshError instanceof Error ? refreshError.message : fallbackError
      }

      setState((current) =>
        current?.scope === scope && current.request === requestId
          ? { ...current, refreshing: false, error }
          : current
      )
    },
    [scope]
  )

  return {
    refreshing: state?.scope === scope && state.refreshing,
    error: state?.scope === scope ? state.error : null,
    runRefresh
  }
}
