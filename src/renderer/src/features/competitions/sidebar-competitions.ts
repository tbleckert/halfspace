interface CompetitionSummary {
  id: number
  name: string
  active: boolean
}

export function sidebarCompetitionId(pathname: string, competitionContext: unknown): number | null {
  const competitionRoute = /^\/competitions\/(\d+)(?:\/|$)/.exec(pathname)
  return competitionRoute
    ? Number(competitionRoute[1])
    : typeof competitionContext === 'number'
      ? competitionContext
      : null
}

export function sidebarCompetitions<T extends CompetitionSummary>(
  competitions: readonly T[],
  pinnedCompetitionIds: readonly number[]
): T[] {
  const activeCompetitions = competitions
    .filter(({ active }) => active)
    .sort((left, right) => left.name.localeCompare(right.name))

  if (activeCompetitions.length <= 10) return activeCompetitions

  const pinned = new Set(pinnedCompetitionIds)
  return activeCompetitions.filter(({ id }) => pinned.has(id))
}
