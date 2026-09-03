import { useEffect, useState } from 'react'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { readEntitySearch, writeEntitySearchRefresh } from '@/data/db'

interface RemoteSearchState {
  query: string
  searching: boolean
  error: string | null
}

export function useEntitySearch(
  query: string,
  enabled: boolean,
  online: boolean
): {
  results: Awaited<ReturnType<typeof readEntitySearch>>
  searching: boolean
  error: string | null
} {
  const normalizedQuery = query.trim()
  const results =
    useScopedLiveQuery(() => readEntitySearch(normalizedQuery), [normalizedQuery]) ?? []
  const [remote, setRemote] = useState<RemoteSearchState>({
    query: '',
    searching: false,
    error: null
  })
  const remoteEnabled = enabled && online && normalizedQuery.length >= 2

  useEffect(() => {
    if (!remoteEnabled) return

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      setRemote({ query: normalizedQuery, searching: true, error: null })

      try {
        const result = await window.halfspace.sportmonks.searchEntities({ query: normalizedQuery })
        if (cancelled) return

        if (!result.ok) {
          setRemote({ query: normalizedQuery, searching: false, error: result.error.message })
          return
        }

        await writeEntitySearchRefresh(result.data)
        if (!cancelled) setRemote({ query: normalizedQuery, searching: false, error: null })
      } catch {
        if (!cancelled) {
          setRemote({
            query: normalizedQuery,
            searching: false,
            error: 'Could not update search results.'
          })
        }
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [normalizedQuery, remoteEnabled])

  const currentRemote = remoteEnabled && remote.query === normalizedQuery
  return {
    results,
    searching: remoteEnabled && (!currentRemote || remote.searching),
    error: currentRemote ? remote.error : null
  }
}
