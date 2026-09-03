import { useRefreshStatus } from '@/lib/use-refresh-status'
import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  readCompetitionCatalog,
  setCompetitionPinned,
  writeCompetitionRefresh
} from '@/data/db'
import { type RefreshableQuery, type RefreshRequest, useStaleRefresh } from '@/lib/refresh'

let refreshGeneration = 0
let activeRefresh: RefreshRequest | null = null

type CompetitionCache = Awaited<ReturnType<typeof readCompetitionCatalog>>

export function useCompetitions(enabled = true): RefreshableQuery<CompetitionCache> {
  const cached = useLiveQuery(() => readCompetitionCatalog(), [])
  const { refreshing, error, runRefresh } = useRefreshStatus('catalog')

  const refresh = useCallback(async () => {
    if (!enabled) return

    await runRefresh(() => refreshCompetitionCatalog(), 'Could not refresh competitions.')
  }, [enabled, runRefresh])

  useStaleRefresh(enabled, cached !== undefined, cached?.catalog?.staleAt, refresh)

  return { cached, refreshing, error, refresh }
}

export function usePinnedCompetitionIds(): number[] | undefined {
  return useLiveQuery(async () => {
    const pins = await db.competitionPins.orderBy('pinnedAt').toArray()
    return pins.map(({ competitionId }) => competitionId)
  }, [])
}

export async function toggleCompetitionPin(
  competitionId: number,
  pinnedCompetitionIds: readonly number[]
): Promise<void> {
  await setCompetitionPinned(competitionId, !pinnedCompetitionIds.includes(competitionId))
}

export function invalidateCompetitionRefresh(): void {
  refreshGeneration += 1
  activeRefresh = null
}

export async function refreshCompetitionCatalog(): Promise<void> {
  if (activeRefresh?.generation === refreshGeneration) return activeRefresh.promise

  const generation = refreshGeneration

  const promise = (async () => {
    const result = await window.halfspace.sportmonks.refreshCompetitions()

    if (generation !== refreshGeneration) return

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    await writeCompetitionRefresh(result.data)
  })()
  activeRefresh = { generation, promise }

  try {
    await promise
  } finally {
    if (activeRefresh?.promise === promise) activeRefresh = null
  }
}
