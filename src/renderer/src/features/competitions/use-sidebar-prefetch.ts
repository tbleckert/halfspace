import { useEffect, useRef } from 'react'
import type { CachedCompetition } from '@/data/db'
import { prefetchFixtureQuery } from '@/features/fixtures/use-fixtures'
import { startPrefetch } from '@/lib/prefetch'
import { prefetchCompetitionWorkspace } from './use-competition-workspace'

export function useSidebarPrefetch(
  competitions: CachedCompetition[],
  date: string,
  timeZone: string,
  online: boolean
): void {
  const warmedCompetitionIds = useRef(new Set<number>())

  useEffect(() => {
    if (!online) return
    let cancelled = false

    startPrefetch(() => prefetchFixtureQuery(date, timeZone))
    startPrefetch(async () => {
      for (const competition of competitions) {
        if (cancelled || !navigator.onLine) return
        if (warmedCompetitionIds.current.has(competition.id)) continue

        try {
          await prefetchCompetitionWorkspace(competition.id)
          if (!cancelled) warmedCompetitionIds.current.add(competition.id)
        } catch {
          continue
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [competitions, date, online, timeZone])
}
