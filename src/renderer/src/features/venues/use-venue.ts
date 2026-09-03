import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useCallback } from 'react'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { readVenueIdentity, writeVenueRefresh } from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

type VenueIdentityCache = Awaited<ReturnType<typeof readVenueIdentity>>

let refreshGeneration = 0
const venueRefreshes = new Map<number, RefreshRequest>()

export function useVenueEntity(
  venueId: number | null,
  enabled: boolean
): RefreshableQuery<VenueIdentityCache> {
  const cached = useScopedLiveQuery(
    () =>
      venueId === null
        ? Promise.resolve({ venue: null, summary: null })
        : readVenueIdentity(venueId),
    [venueId]
  )
  const { refreshing, error, runRefresh } = useRefreshStatus(venueId)
  const refresh = useCallback(async () => {
    if (!enabled || venueId === null) return

    await runRefresh(() => refreshVenueEntity(venueId), 'Could not refresh venue.')
  }, [enabled, venueId, runRefresh])

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
