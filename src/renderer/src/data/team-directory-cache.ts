import type { TeamDirectoryInput, TeamDirectoryRefresh } from '@shared/team-directory'
import { db, toCachedIncludedTeam, type TeamDirectoryQuery, type CachedTeam } from './db'

export function teamDirectoryKey(input: TeamDirectoryInput): string {
  return JSON.stringify([
    input.query ?? '',
    input.countryId ?? null,
    input.seasonId ?? null,
    input.page
  ])
}

export async function readTeamDirectory(
  input: TeamDirectoryInput
): Promise<{ query: TeamDirectoryQuery | null; teams: CachedTeam[] }> {
  const query = await db.teamDirectoryQueries.get(teamDirectoryKey(input))
  const teams = query
    ? (await db.teams.bulkGet(query.teamIds)).filter((team): team is CachedTeam => !!team)
    : []
  return { query: query ?? null, teams }
}

export async function writeTeamDirectory(
  input: TeamDirectoryInput,
  refresh: TeamDirectoryRefresh
): Promise<void> {
  const key = teamDirectoryKey(input)
  if (teamDirectoryKey(refresh) !== key)
    throw new Error('Team directory response does not match the requested page.')
  await db.transaction('rw', db.teamDirectoryQueries, db.teams, async () => {
    const previous = await db.teamDirectoryQueries.get(key)
    if (previous && previous.fetchedAt > refresh.fetchedAt) return
    const existing = await db.teams.bulkGet(refresh.teams.map(({ id }) => id))
    await db.teams.bulkPut(
      refresh.teams.map((team, index) =>
        toCachedIncludedTeam(team, existing[index], refresh.fetchedAt)
      )
    )
    const { teams, ...metadata } = refresh
    await db.teamDirectoryQueries.put({
      ...metadata,
      key,
      teamIds: teams.map(({ id }) => id),
      staleAt: refresh.fetchedAt + 86_400_000
    })
  })
}
