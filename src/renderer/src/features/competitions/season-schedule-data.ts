export function selectedSchedulePart<
  T extends { id: number; is_current: boolean; finished: boolean }
>(items: T[], requestedId?: number): T | undefined {
  return (
    items.find((item) => item.id === requestedId) ??
    items.find((item) => item.is_current) ??
    items.find((item) => !item.finished) ??
    items.at(-1)
  )
}

export function sortScheduleRounds<T extends { name: string; starting_at?: string | null }>(
  rounds: T[]
): T[] {
  return [...rounds].sort((a, b) => {
    if (a.starting_at && b.starting_at && a.starting_at !== b.starting_at)
      return a.starting_at.localeCompare(b.starting_at)
    return a.name.localeCompare(b.name, undefined, { numeric: true })
  })
}
