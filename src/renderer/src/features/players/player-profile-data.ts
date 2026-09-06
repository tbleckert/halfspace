import type { SportmonksPlayer } from '@shared/contracts'

export function playerPreferredFoot(player: SportmonksPlayer): string | null {
  const value = player.metadata?.find(({ type_id }) => type_id === 229)?.values
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim().replace(/^./, (letter) => letter.toUpperCase())
}

export function playerBirthplace(player: SportmonksPlayer): string | null {
  return [player.city?.name, player.country?.name].filter(Boolean).join(', ') || null
}
