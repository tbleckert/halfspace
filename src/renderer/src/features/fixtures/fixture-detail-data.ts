import type { SportmonksEvent, SportmonksFixtureStatistic, SportmonksOdd } from '@shared/contracts'

export interface StatisticRow {
  id: number
  label: string
  home: number | string | null
  away: number | string | null
  group: string | null
}

export interface OddsGroup {
  key: string
  market: string
  bookmaker: string
  odds: SportmonksOdd[]
}

export function sortedFixtureEvents(events: SportmonksEvent[]): SportmonksEvent[] {
  return events.toSorted(
    (left, right) =>
      left.minute - right.minute ||
      (left.extra_minute ?? 0) - (right.extra_minute ?? 0) ||
      left.id - right.id
  )
}

export function fixtureStatisticRows(statistics: SportmonksFixtureStatistic[]): StatisticRow[] {
  const rows = new Map<number, StatisticRow>()

  for (const statistic of statistics) {
    const row = rows.get(statistic.type_id) ?? {
      id: statistic.type_id,
      label: statistic.type?.name ?? `Statistic ${statistic.type_id}`,
      home: null,
      away: null,
      group: statistic.type?.stat_group ?? null
    }
    row[statistic.location] = statistic.data.value ?? null
    rows.set(statistic.type_id, row)
  }

  return [...rows.values()].toSorted((left, right) => left.label.localeCompare(right.label))
}

export function fixtureOddsGroups(odds: SportmonksOdd[]): OddsGroup[] {
  const groups = new Map<string, OddsGroup>()

  for (const odd of odds) {
    const key = `${odd.market_id}|${odd.bookmaker_id}`
    const group = groups.get(key) ?? {
      key,
      market: odd.market?.name ?? odd.market_description ?? `Market ${odd.market_id}`,
      bookmaker: odd.bookmaker?.name ?? `Bookmaker ${odd.bookmaker_id}`,
      odds: []
    }
    group.odds.push(odd)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      odds: group.odds.toSorted((left, right) => left.label.localeCompare(right.label))
    }))
    .toSorted(
      (left, right) =>
        left.market.localeCompare(right.market) || left.bookmaker.localeCompare(right.bookmaker)
    )
}
