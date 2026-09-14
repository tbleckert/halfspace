import type { CachedTransfer } from '@/data/db'
import { addDaysToIsoDate } from '@/lib/date'
import { transferTimestamp } from '@/features/transfers/transfer-display'

export function recentViewTransfers(
  transfers: CachedTransfer[],
  teamId: number,
  direction: 'all' | 'incoming' | 'outgoing',
  today: string
): CachedTransfer[] {
  const start = transferTimestamp(addDaysToIsoDate(today, -364))
  const end = transferTimestamp(today)
  return transfers
    .filter((transfer) => {
      const incoming = transfer.toTeamId === teamId && transfer.fromTeamId !== teamId
      const outgoing = transfer.fromTeamId === teamId && transfer.toTeamId !== teamId
      const date = transferTimestamp(transfer.date)
      return (
        transfer.raw.completed &&
        date >= start &&
        date <= end &&
        (direction === 'incoming'
          ? incoming
          : direction === 'outgoing'
            ? outgoing
            : incoming || outgoing)
      )
    })
    .toSorted((left, right) => transferTimestamp(right.date) - transferTimestamp(left.date))
}
