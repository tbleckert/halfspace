import { useMemo } from 'react'
import type { StatisticSeasonRecord } from '@shared/contracts'
import type { StatisticSeasonQuery } from '@/data/db'
import type { RefreshableQuery } from '@/lib/refresh'
import type { ComparisonKind } from './comparison-data'
import {
  comparisonSeasons,
  selectedComparisonRecord,
  type ComparisonSeason
} from './comparison-seasons'
import { useStatisticSeasons } from './use-statistic-seasons'

export type ComparisonSeasonContext = RefreshableQuery<StatisticSeasonQuery | null> & {
  seasons: ComparisonSeason[]
  selected: StatisticSeasonRecord | null
}

export function useComparisonSeason(
  kind: ComparisonKind,
  id: number | undefined,
  seasonId: number | undefined,
  teamId: number | undefined,
  online: boolean
): ComparisonSeasonContext {
  const input = useMemo(() => (id ? { entity: kind, entityId: id } : null), [kind, id])
  const query = useStatisticSeasons(input, online)
  const seasons = comparisonSeasons(query.cached?.records ?? [])
  return { ...query, seasons, selected: selectedComparisonRecord(seasons, seasonId, teamId) }
}
