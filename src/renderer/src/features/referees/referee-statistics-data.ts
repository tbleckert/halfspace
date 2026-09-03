import type { SportmonksRefereeStatistic } from '@shared/contracts'

export function refereeSeasonOptions(statistics: SportmonksRefereeStatistic[]): {
  id: number
  name: string
}[] {
  const seasons = [
    ...new Map(
      statistics.flatMap(({ season }) => (season ? [[season.id, season] as const] : []))
    ).values()
  ].sort(
    (left, right) =>
      (right.starting_at ?? '').localeCompare(left.starting_at ?? '') || right.id - left.id
  )
  const counts = new Map<number, number>()
  return seasons.flatMap((season) => {
    const count = counts.get(season.league_id) ?? 0
    counts.set(season.league_id, count + 1)
    return count < 10
      ? [
          {
            id: season.id,
            name: `${season.name} · ${season.league?.name ?? `Competition ${season.league_id}`}`
          }
        ]
      : []
  })
}
