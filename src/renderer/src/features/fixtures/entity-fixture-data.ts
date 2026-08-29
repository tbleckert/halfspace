import type { CachedFixture } from '@/data/db'

export interface EntityFixtureGroup {
  date: string
  fixtures: CachedFixture[]
}

export function splitEntityFixtures(
  fixtures: readonly CachedFixture[],
  now: number
): { recent: CachedFixture[]; upcoming: CachedFixture[] } {
  const datedFixtures = fixtures.filter(
    (fixture): fixture is CachedFixture & { startingAt: number } => fixture.startingAt !== null
  )

  return {
    recent: datedFixtures
      .filter(({ startingAt }) => startingAt < now)
      .toSorted((left, right) => right.startingAt - left.startingAt)
      .slice(0, 5),
    upcoming: datedFixtures
      .filter(({ startingAt }) => startingAt >= now)
      .toSorted((left, right) => left.startingAt - right.startingAt)
      .slice(0, 5)
  }
}

export function groupEntityFixturesByDate(
  fixtures: readonly CachedFixture[],
  timeZone: string
): EntityFixtureGroup[] {
  const groups = new Map<string, CachedFixture[]>()

  for (const fixture of fixtures
    .filter(
      (candidate): candidate is CachedFixture & { startingAt: number } =>
        candidate.startingAt !== null
    )
    .toSorted((left, right) => left.startingAt - right.startingAt)) {
    const date = isoDateInTimeZone(fixture.startingAt, timeZone)
    const group = groups.get(date) ?? []
    group.push(fixture)
    groups.set(date, group)
  }

  return [...groups].map(([date, groupedFixtures]) => ({ date, fixtures: groupedFixtures }))
}

function isoDateInTimeZone(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric'
  }).formatToParts(timestamp)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}
