import type { CachedFixture } from '@/data/db'
import { addDaysToIsoDate, isoDateInTimeZone } from '@/lib/date'

const finishedStateIds = new Set([5, 7, 8])

export interface YourTeamFixture {
  date: string
  fixture: CachedFixture
}

export function selectYourTeamFixtures(
  fixtures: CachedFixture[],
  teamId: number,
  today: string,
  timeZone: string
): { upcoming?: YourTeamFixture; previous?: YourTeamFixture } {
  const startDate = addDaysToIsoDate(today, -30)
  const endDate = addDaysToIsoDate(today, 30)
  const entries = fixtures.flatMap((fixture): YourTeamFixture[] => {
    if (fixture.placeholder || fixture.startingAt === null) return []
    if (fixture.homeTeamId !== teamId && fixture.awayTeamId !== teamId) return []
    const date = isoDateInTimeZone(fixture.startingAt, timeZone)
    return date >= startDate && date <= endDate ? [{ date, fixture }] : []
  })
  entries.sort(
    (a, b) => a.fixture.startingAt! - b.fixture.startingAt! || a.fixture.id - b.fixture.id
  )

  return {
    upcoming: entries.find(({ date, fixture }) => fixture.stateId === 1 && date >= today),
    previous: entries.findLast(
      ({ date, fixture }) => finishedStateIds.has(fixture.stateId) && date <= today
    )
  }
}
