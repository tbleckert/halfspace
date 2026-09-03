import type { StatisticSeasonRecord } from '@shared/contracts'

export interface ComparisonSeason {
  name: string
  records: StatisticSeasonRecord[]
}

function seasonName(name: string): string {
  return name
    .trim()
    .replace(/^(\d{2})(\d{2})\/(\d{2})$/, (_, century: string, first: string, last: string) => {
      const nextCentury = Number(last) < Number(first) ? Number(century) + 1 : Number(century)
      return `${century}${first}/${nextCentury}${last}`
    })
}

export function comparisonSeasons(records: StatisticSeasonRecord[]): ComparisonSeason[] {
  const groups = new Map<string, StatisticSeasonRecord[]>()
  for (const record of records) {
    const name = seasonName(record.season.name)
    const group = groups.get(name) ?? []
    if (!group.some((item) => item.season.id === record.season.id && item.teamId === record.teamId))
      group.push(record)
    groups.set(name, group)
  }
  return [...groups]
    .sort(([first], [second]) => second.localeCompare(first, undefined, { numeric: true }))
    .slice(0, 10)
    .map(([name, entries]) => ({
      name,
      records: entries.sort(
        (a, b) =>
          a.competitionName.localeCompare(b.competitionName) ||
          a.teamName.localeCompare(b.teamName) ||
          a.season.id - b.season.id ||
          a.teamId - b.teamId
      )
    }))
}

export function selectedComparisonRecord(
  seasons: ComparisonSeason[],
  seasonId?: number,
  teamId?: number
): StatisticSeasonRecord | null {
  if (!seasonId) return seasons[0]?.records[0] ?? null
  return (
    seasons
      .flatMap((season) => season.records)
      .find(
        (record) =>
          record.season.id === seasonId && (teamId === undefined || record.teamId === teamId)
      ) ?? null
  )
}
