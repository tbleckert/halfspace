import type { CachedFixture } from '@/data/db'
import { addDaysToIsoDate } from '@/lib/date'
import { isFixtureOngoing } from '@/lib/fixture-state'

const finishedStateIds = new Set([5, 7, 8])
const pastWindowDays = 3
const futureWindowDays = 7
const followingDayLimit = 3
const earlierDayLimit = 2

export interface MatchdayFixturesDay {
  date: string
  fixtures: CachedFixture[]
}

export interface MatchdayWindow {
  startDate: string
  endDate: string
  dates: string[]
  navigationDates: string[]
}

export interface MatchdaySections {
  live: CachedFixture[]
  selected: CachedFixture[]
  following: MatchdayFixturesDay[]
  earlier: MatchdayFixturesDay[]
}

export function matchdayWindow(anchorDate: string): MatchdayWindow {
  const navigationStartDate = startOfWeek(anchorDate)
  const navigationEndDate = addDaysToIsoDate(navigationStartDate, 6)
  const rollingStartDate = addDaysToIsoDate(anchorDate, -pastWindowDays)
  const rollingEndDate = addDaysToIsoDate(anchorDate, futureWindowDays)
  const startDate = rollingStartDate < navigationStartDate ? rollingStartDate : navigationStartDate
  const endDate = rollingEndDate > navigationEndDate ? rollingEndDate : navigationEndDate
  const dates = datesBetween(startDate, endDate)

  return {
    startDate,
    endDate,
    dates,
    navigationDates: datesBetween(navigationStartDate, navigationEndDate)
  }
}

function startOfWeek(date: string): string {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return addDaysToIsoDate(date, -daysSinceMonday)
}

function datesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = []

  for (let date = startDate; date <= endDate; date = addDaysToIsoDate(date, 1)) {
    dates.push(date)
  }

  return dates
}

export function buildMatchdaySections(
  days: MatchdayFixturesDay[],
  selectedDate: string,
  today: string
): MatchdaySections {
  const selectedFixtures = days.find(({ date }) => date === selectedDate)?.fixtures ?? []
  const live =
    selectedDate === today
      ? selectedFixtures.filter(({ stateId }) => isFixtureOngoing(stateId))
      : []
  const selected =
    live.length > 0
      ? selectedFixtures.filter(({ stateId }) => !isFixtureOngoing(stateId))
      : selectedFixtures

  const following = days
    .filter(({ date, fixtures }) => date > selectedDate && fixtures.length > 0)
    .slice(0, followingDayLimit)

  const earlier = days
    .filter(({ date }) => date < selectedDate)
    .reverse()
    .map(({ date, fixtures }) => ({
      date,
      fixtures:
        selectedDate === today
          ? fixtures.filter(({ stateId }) => finishedStateIds.has(stateId))
          : fixtures
    }))
    .filter(({ fixtures }) => fixtures.length > 0)
    .slice(0, earlierDayLimit)

  return { live, selected, following, earlier }
}
