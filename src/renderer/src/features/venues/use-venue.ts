import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readVenueIdentity, writeVenueRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type VenueIdentityCache = Awaited<ReturnType<typeof readVenueIdentity>>

let refreshGeneration = 0
const venueRefreshes = new Map<number, RefreshRequest>()

export function useVenueEntity(
  venueId: number | null,
  enabled: boolean
): RefreshableQuery<VenueIdentityCache> {
  const cached = useLiveQuery(
    () =>
      venueId === null
        ? Promise.resolve({ venue: null, summary: null })
        : readVenueIdentity(venueId),
    [venueId]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!enabled || venueId === null) return

    setRefreshing(true)
    setError(null)

    try {
      await refreshVenueEntity(venueId)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh venue.')
    } finally {
      setRefreshing(false)
    }
  }, [enabled, venueId])

  useStaleRefresh(
    enabled && venueId !== null,
    cached !== undefined,
    cached?.venue?.staleAt,
    refresh
  )

  return { cached, refreshing, error, refresh }
}

export function invalidateVenueRefreshes(): void {
  refreshGeneration += 1
  venueRefreshes.clear()
}

export async function prefetchVenueEntity(venueId: number): Promise<void> {
  const cached = await readVenueIdentity(venueId)
  if (cached.venue && cached.venue.staleAt > Date.now()) return

  await refreshVenueEntity(venueId)
}

export async function refreshVenueEntity(venueId: number): Promise<void> {
  const active = venueRefreshes.get(venueId)
  if (active?.generation === refreshGeneration) return active.promise

  const generation = refreshGeneration
  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshVenue({ venueId })
    if (generation !== refreshGeneration) return
    if (!result.ok) throw new Error(result.error.message)
    await writeVenueRefresh(result.data)
  })()

  venueRefreshes.set(venueId, { generation, promise })

  try {
    await promise
  } finally {
    if (venueRefreshes.get(venueId)?.promise === promise) venueRefreshes.delete(venueId)
  }
}
