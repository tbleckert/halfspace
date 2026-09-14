import { useMemo } from 'react'
import { useCompetitionFixtures } from '@/features/competitions/use-competition-workspace'
import { currentTimeZone } from '@/lib/date'
import { useTodayInTimeZone } from '@/lib/use-today'
import { useCurrentTime } from '@/lib/use-current-time'
import {
  shortlistFixtures,
  shortlistWindow,
  type MarketShortlistBlock
} from './market-shortlist-data'

export function useMarketShortlist(
  block: MarketShortlistBlock,
  online: boolean
): {
  query: ReturnType<typeof useCompetitionFixtures>
  fixtures: ReturnType<typeof shortlistFixtures>
  selected: ReturnType<typeof shortlistFixtures>[number] | undefined
  input: { competitionId: number; timeZone: string; startDate: string; endDate: string }
  today: string
} {
  const timeZone = useMemo(() => currentTimeZone(), [])
  const today = useTodayInTimeZone(timeZone)
  const now = useCurrentTime()
  const input = useMemo(
    () => ({
      competitionId: block.competitionId,
      timeZone,
      ...shortlistWindow(today, block.period)
    }),
    [block.competitionId, block.period, timeZone, today]
  )
  const query = useCompetitionFixtures(input, online)
  const fixtures = shortlistFixtures(query.cached?.fixtures ?? [], block, now, input)
  const selected =
    block.selectedFixtureId === null
      ? fixtures[0]
      : fixtures.find((fixture) => fixture.id === block.selectedFixtureId)
  return { query, fixtures, selected, input, today }
}
