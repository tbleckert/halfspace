import type { ViewBlock } from '@shared/views'
import type { CachedFixture } from '@/data/db'
import type { SportmonksOdd } from '@shared/contracts'
import { addDaysToIsoDate, isoDateInTimeZone } from '@/lib/date'
import { oddsComparison, availablePrice } from '@/features/fixtures/odds-comparison'

export type MarketShortlistBlock = Extract<ViewBlock, { type: 'market-shortlist' }>

export function shortlistWindow(
  today: string,
  period: MarketShortlistBlock['period']
): { startDate: string; endDate: string } {
  if (period === 'next-seven-days') return { startDate: today, endDate: addDaysToIsoDate(today, 6) }
  const day = new Date(`${today}T00:00:00Z`).getUTCDay()
  const startDate = addDaysToIsoDate(today, day === 0 ? -1 : 6 - day)
  return { startDate, endDate: addDaysToIsoDate(startDate, 1) }
}

export function shortlistFixtures(
  fixtures: CachedFixture[],
  block: MarketShortlistBlock,
  now: number,
  window: { startDate: string; endDate: string; timeZone: string }
): CachedFixture[] {
  return fixtures
    .filter(
      (fixture) =>
        (block.competitionId === null ||
          (fixture.leagueId === block.competitionId && fixture.seasonId === block.seasonId)) &&
        fixture.stateId === 1 &&
        fixture.startingAt !== null &&
        fixture.startingAt > now &&
        isoDateInTimeZone(fixture.startingAt, window.timeZone) >= window.startDate &&
        isoDateInTimeZone(fixture.startingAt, window.timeZone) <= window.endDate
    )
    .toSorted((a, b) => a.startingAt! - b.startingAt! || a.id - b.id)
}

export function shortlistPrices(
  odds: SportmonksOdd[],
  fixtureId: number,
  outcome: MarketShortlistBlock['outcome']
): { label: string; quote: SportmonksOdd | null }[] {
  const rows = oddsComparison(
    odds.filter((quote) => quote.fixture_id === fixtureId),
    1
  ).rows
  const labels =
    outcome === 'all' ? ['Home', 'Draw', 'Away'] : [outcome[0].toUpperCase() + outcome.slice(1)]
  return labels.map((label) => {
    // Only the standard full-time result scope: never pool handicaps, totals or other periods.
    const row = rows.find((row) => row.label === label && row.detail === '')
    const quotes = [...(row?.quotes.values() ?? [])]
      .filter((quote) => availablePrice(quote) !== null)
      .toSorted(
        (a, b) => availablePrice(b)! - availablePrice(a)! || a.bookmaker_id - b.bookmaker_id
      )
    return { label, quote: quotes[0] ?? null }
  })
}
