import { expect, it } from 'vitest'
import type { SportmonksFixture } from '@shared/contracts'
import { toCachedFixtures } from '@/data/db'
import { formTrendInput, selectFormTrend } from './form-trend-data'

const now = Date.UTC(2026, 8, 14, 12)
const input = formTrendInput(19, '2026-09-14', 'UTC')

function match(id: number, days: number, location: 'home' | 'away' = 'home'): SportmonksFixture {
  return {
    id,
    league_id: 8,
    season_id: 12,
    state_id: 5,
    starting_at_timestamp: (now + days * 86400000) / 1000,
    placeholder: false,
    has_odds: false,
    participants: [
      { id: 19, name: 'Arsenal', meta: { location } },
      { id: 20, name: 'Opponent', meta: { location: location === 'home' ? 'away' : 'home' } }
    ],
    scores: [
      {
        id: 1,
        participant_id: 19,
        description: 'CURRENT',
        score: { goals: 2, participant: location }
      },
      {
        id: 2,
        participant_id: 20,
        description: 'CURRENT',
        score: { goals: 0, participant: location === 'home' ? 'away' : 'home' }
      }
    ]
  }
}

it('selects the latest six completed matches in the date window, oldest first, after location filtering', async () => {
  const raw = [
    ...Array.from({ length: 8 }, (_, index) => match(index + 1, -index - 1)),
    match(9, -1, 'away'),
    match(10, -100),
    match(11, 1),
    { ...match(12, -1), state_id: 2 },
    { ...match(13, -1), state_id: 17 },
    { ...match(14, -1), placeholder: true },
    { ...match(15, -1), participants: [{ id: 99, name: 'Other' }] },
    { ...match(16, -1), starting_at_timestamp: null }
  ]
  const fixtures = await toCachedFixtures(raw, now, now + 60000)
  expect(selectFormTrend(fixtures, input, 'home', now).map(({ fixture }) => fixture.id)).toEqual([
    6, 5, 4, 3, 2, 1
  ])
  expect(selectFormTrend(fixtures, input, 'away', now).map(({ fixture }) => fixture.id)).toEqual([
    9
  ])
  expect(selectFormTrend(fixtures, input, 'all', now)).toHaveLength(6)
  expect(fixtures[0].id).toBe(1)
})

it('keeps missing scores unknown and shootout outcomes separate from goals', async () => {
  const penalties = match(1, -3, 'away')
  penalties.state_id = 8
  penalties.scores[1].score.goals = 2
  penalties.scores.push({
    id: 3,
    participant_id: 19,
    description: 'PENALTIES',
    score: { goals: 5, participant: 'away' }
  })
  penalties.participants[0].meta!.winner = true
  const unknownWinner = { ...penalties, id: 2, participants: match(2, -3, 'away').participants }
  const missing = { ...match(3, -1), scores: [match(3, -1).scores[1]] }
  const extraTime = { ...match(4, -2), state_id: 7 }
  const fixtures = await toCachedFixtures(
    [penalties, unknownWinner, missing, extraTime],
    now,
    now + 60000
  )
  const rows = selectFormTrend(fixtures, input, 'all', now)
  expect(rows.find(({ fixture }) => fixture.id === 1)).toMatchObject({
    goalsFor: 2,
    goalsAgainst: 2,
    outcome: 'W',
    location: 'away'
  })
  expect(rows.find(({ fixture }) => fixture.id === 2)?.outcome).toBeNull()
  expect(rows.find(({ fixture }) => fixture.id === 3)).toMatchObject({
    goalsFor: null,
    goalsAgainst: 0,
    outcome: null
  })
  expect(rows.find(({ fixture }) => fixture.id === 4)).toMatchObject({ goalsFor: 2, outcome: 'W' })
})

it('uses 100 local calendar days and keeps an unknown location out of home or away samples', async () => {
  expect(input).toEqual({
    teamId: 19,
    startDate: '2026-06-07',
    endDate: '2026-09-14',
    timeZone: 'UTC'
  })
  const raw = match(1, -1)
  raw.participants[0].meta = undefined
  const fixtures = await toCachedFixtures([raw], now, now + 60000)
  expect(selectFormTrend(fixtures, input, 'home', now)).toEqual([])
  expect(selectFormTrend(fixtures, input, 'all', now)[0].location).toBeNull()
  const boundary = { ...match(2, -99), starting_at_timestamp: Date.UTC(2026, 5, 6, 23) / 1000 }
  const localFixtures = await toCachedFixtures([boundary], now, now + 60000)
  expect(selectFormTrend(localFixtures, input, 'all', now)).toHaveLength(0)
  expect(
    selectFormTrend(localFixtures, { ...input, timeZone: 'Europe/Stockholm' }, 'all', now)
  ).toHaveLength(1)
})
