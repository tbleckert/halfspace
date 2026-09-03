import { useEffect, useState } from 'react'
import type { EntitySearchInput } from '@shared/contracts'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { readEntitySearch, writeEntitySearchRefresh } from '@/data/db'

interface RemoteSearchState {
  query: string
  searching: boolean
  error: string | null
}

let refreshGeneration = 0

export function invalidateSearchRefreshes(): void {
  refreshGeneration += 1
}

export function useEntitySearch(
  query: string,
  enabled: boolean,
  online: boolean,
  entity?: EntitySearchInput['entity']
): {
  results: Awaited<ReturnType<typeof readEntitySearch>>
  searching: boolean
  error: string | null
} {
  const normalizedQuery = query.trim()
  const searchKey = `${entity ?? 'all'}:${normalizedQuery}`
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
    const generation = refreshGeneration
    const isCurrent = (): boolean => !cancelled && generation === refreshGeneration
    const timeout = window.setTimeout(async () => {
      if (!isCurrent()) return
      setRemote({ query: searchKey, searching: true, error: null })

      try {
        const result = await window.halfspace.sportmonks.searchEntities({
          query: normalizedQuery,
          ...(entity ? { entity } : {})
        })
        if (!isCurrent()) return

        if (!result.ok) {
          setRemote({ query: searchKey, searching: false, error: result.error.message })
          return
        }

        await writeEntitySearchRefresh(result.data)
        if (isCurrent()) setRemote({ query: searchKey, searching: false, error: null })
      } catch {
        if (isCurrent()) {
          setRemote({
            query: searchKey,
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
  }, [normalizedQuery, remoteEnabled, entity, searchKey])

  const currentRemote = remoteEnabled && remote.query === searchKey
  return {
    results,
    searching: remoteEnabled && (!currentRemote || remote.searching),
    error: currentRemote ? remote.error : null
  }
}
