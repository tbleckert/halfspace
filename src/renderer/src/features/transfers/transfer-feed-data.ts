import type { CachedTransfer } from '@/data/db'
import { isIsoDate } from '@/lib/date'

export function transferRangeError(start: string, end: string): string | null {
  if (!isIsoDate(start) || !isIsoDate(end) || start > end) return 'Choose a valid date range.'
  return (Date.parse(end) - Date.parse(start)) / 86_400_000 >= 31 ? 'Choose up to 31 days.' : null
}

export function filterTransferPage(
  transfers: CachedTransfer[],
  query: string,
  status: 'all' | 'completed' | 'pending'
): CachedTransfer[] {
  const term = query.trim().toLocaleLowerCase()
  return transfers.filter(({ raw }) => {
    if (status !== 'all' && raw.completed !== (status === 'completed')) return false
    const names = [raw.player?.display_name, raw.player?.name, raw.fromTeam?.name, raw.toTeam?.name]
    return !term || names.some((name) => name?.toLocaleLowerCase().includes(term))
  })
}
