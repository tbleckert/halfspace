import type { ViewContext, ViewSpec, ViewTeamContext } from '@shared/views'
import { prefetchTeamSeasons } from '@/features/teams/use-team-seasons'
import { readViewContexts, viewContexts } from './saved-views'

export function historicalViewTeams(
  prompt: string,
  teams: ViewTeamContext[],
  current: ViewSpec | null
): ViewTeamContext[] {
  if (!/\b(?:19|20)\d{2}(?:[/-](?:\d{4}|\d{2}))?\b/.test(prompt)) return []
  const words = (value: string): string =>
    ` ${value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()} `
  const named = teams.filter((team) => words(prompt).includes(words(team.teamName)))
  if (named.length) return named
  return teams.filter((team) =>
    current?.blocks.some((block) => 'teamId' in block && block.teamId === team.teamId)
  )
}

export async function prepareViewContexts(
  prompt: string,
  contexts: ViewContext[],
  teams: ViewTeamContext[],
  current: ViewSpec | null
): Promise<ViewContext[]> {
  // Query only named teams' season metadata, through the shared cache and request lifetime.
  // Failed lookups retain known context; generation can explain an unavailable exact season.
  await Promise.allSettled(teams.map((team) => prefetchTeamSeasons({ teamId: team.teamId })))
  const available = await readViewContexts(prompt)
  return viewContexts([...available, ...contexts], current?.blocks ?? [])
}
