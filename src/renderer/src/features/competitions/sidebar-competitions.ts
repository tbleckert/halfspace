interface CompetitionSummary {
  id: number
  name: string
  active: boolean
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
