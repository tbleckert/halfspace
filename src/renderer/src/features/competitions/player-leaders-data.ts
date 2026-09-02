import type { SportmonksTopscorer } from '@shared/contracts'

export const leaderboardCategories = [
  { id: 208, value: 'goals', label: 'Goals' },
  { id: 209, value: 'assists', label: 'Assists' },
  { id: 84, value: 'yellow-cards', label: 'Yellow cards' },
  { id: 83, value: 'red-cards', label: 'Red cards' }
] as const

export type PlayerLeaderboardCategory = (typeof leaderboardCategories)[number]['value']

export function leadingPlayers(
  topscorers: readonly SportmonksTopscorer[],
  typeId: number
): SportmonksTopscorer[] {
  const rows = topscorers.filter(({ type_id, total }) => type_id === typeId && total > 0)
  const highestTotal = Math.max(0, ...rows.map(({ total }) => total))
  return rows
    .filter(({ total }) => total === highestTotal)
    .toSorted((left, right) => left.position - right.position || left.id - right.id)
}
