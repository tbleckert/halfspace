import type { CachedTransfer } from '@/data/db'

export function transferLabel(transfer: CachedTransfer): string {
  if (transfer.raw.career_ended) return 'Career ended'
  return transfer.raw.type?.name ?? 'Transfer'
}

export function transferTimestamp(value: string): number {
  const timestamp = new Date(`${value}T00:00:00Z`).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function formatTransferDate(value: string): string {
  const timestamp = transferTimestamp(value)
  if (timestamp === 0) return value

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(timestamp)
}
