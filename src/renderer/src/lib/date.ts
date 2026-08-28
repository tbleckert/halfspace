export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function todayInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  )
}

export function addDaysToIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))

  return date.toISOString().slice(0, 10)
}

export function fixtureCacheExpiry(date: string, timeZone: string, fetchedAt: number): number {
  const today = todayInTimeZone(timeZone)

  if (date < today) return fetchedAt + 24 * 60 * 60 * 1000
  if (date > today) return fetchedAt + 6 * 60 * 60 * 1000
  return fetchedAt + 5 * 60 * 1000
}

export function formatFixtureTime(timestamp: number | null): string {
  if (timestamp === null) return 'Time unavailable'

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

export function formatRelativeUpdate(timestamp: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000))

  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`

  const hours = Math.round(minutes / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}
