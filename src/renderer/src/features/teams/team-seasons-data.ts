import type { TeamSeason } from '@shared/discovery'

export function groupTeamSeasons(
  seasons: TeamSeason[]
): { competitionId: number; name: string; imagePath: string | null; seasons: TeamSeason[] }[] {
  const groups = new Map<
    number,
    { competitionId: number; name: string; imagePath: string | null; seasons: TeamSeason[] }
  >()
  for (const season of seasons) {
    const group = groups.get(season.league_id) ?? {
      competitionId: season.league_id,
      name: season.league?.name ?? `Competition ${season.league_id}`,
      imagePath: season.league?.image_path ?? null,
      seasons: []
    }
    group.seasons.push(season)
    groups.set(season.league_id, group)
  }
  for (const group of groups.values())
    group.seasons.sort(
      (a, b) =>
        (b.starting_at ?? '').localeCompare(a.starting_at ?? '') ||
        b.name.localeCompare(a.name, undefined, { numeric: true }) ||
        b.id - a.id
    )
  return [...groups.values()].sort(
    (a, b) =>
      (b.seasons[0]?.starting_at ?? '').localeCompare(a.seasons[0]?.starting_at ?? '') ||
      a.name.localeCompare(b.name)
  )
}
