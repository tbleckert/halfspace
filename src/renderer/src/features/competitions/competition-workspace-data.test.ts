import { describe, expect, it } from 'vitest'
import type { CachedFixture, CachedStanding } from '@/data/db'
import {
  competitionTeams,
  groupCompetitionFixturesByDate,
  groupStandings,
  nearestFixtureSeasonId
} from './competition-workspace-data'
import { splitEntityFixtures } from '@/features/fixtures/entity-fixture-data'

describe('competition workspace data', () => {
  it('groups overall standings by stage and sorts them by position', () => {
    const standings = [standing(2, 2, 'overall'), standing(1, 1, 'overall'), standing(3, 1, 'home')]

    expect(groupStandings(standings)).toEqual([
      {
        key: 'stage:4',
        name: 'Regular Season',
        standings: [standings[1], standings[0]]
      }
    ])
  })

  it('keeps the five nearest past and future fixtures', () => {
    const now = Date.UTC(2026, 7, 28, 12)
    const fixtures = Array.from({ length: 12 }, (_, index) =>
      fixture(index + 1, now + (index - 6) * 60_000)
    )

    const split = splitEntityFixtures(fixtures, now)

    expect(split.recent.map(({ id }) => id)).toEqual([6, 5, 4, 3, 2])
    expect(split.upcoming.map(({ id }) => id)).toEqual([7, 8, 9, 10, 11])
    expect(nearestFixtureSeasonId(fixtures, now)).toBe(23614)
  })

  it('groups the fixture browser by local match date', () => {
    const fixtures = [
      fixture(3, Date.UTC(2026, 7, 29, 18)),
      fixture(1, Date.UTC(2026, 7, 28, 18)),
      fixture(2, Date.UTC(2026, 7, 28, 12))
    ]

    expect(groupCompetitionFixturesByDate(fixtures, 'Europe/Stockholm')).toEqual([
      {
        date: '2026-08-28',
        fixtures: [fixtures[2], fixtures[1]]
      },
      {
        date: '2026-08-29',
        fixtures: [fixtures[0]]
      }
    ])
  })

  it('builds a ranked team directory and fills standing gaps from fixtures', () => {
    const fixtures = [
      fixture(1, Date.UTC(2026, 7, 28, 18), [
        { id: 2, name: 'North FC', image_path: 'north.png' },
        { id: 3, name: 'West FC', image_path: 'west.png' }
      ])
    ]
    const standings = [
      standing(10, 2, 'overall', { id: 2, name: 'North FC', image_path: 'north.png' }),
      standing(11, 1, 'overall', { id: 1, name: 'East FC', image_path: 'east.png' }),
      standing(12, 1, 'home', { id: 1, name: 'East FC', image_path: 'east.png' })
    ]

    expect(competitionTeams(standings, fixtures)).toEqual([
      { id: 1, imagePath: 'east.png', name: 'East FC', points: 10, position: 1 },
      { id: 2, imagePath: 'north.png', name: 'North FC', points: 10, position: 2 },
      { id: 3, imagePath: 'west.png', name: 'West FC', points: null, position: null }
    ])
  })
})

function standing(
  id: number,
  position: number,
  result: string,
  participant = { id, name: `Team ${id}`, image_path: null as string | null }
): CachedStanding {
  return {
    id,
    participantId: participant.id,
    leagueId: 8,
    seasonId: 23614,
    stageId: 4,
    groupId: null,
    position,
    fetchedAt: 0,
    raw: {
      id,
      participant_id: id,
      league_id: 8,
      season_id: 23614,
      stage_id: 4,
      group_id: null,
      round_id: null,
      standing_rule_id: 1,
      position,
      result,
      points: 10,
      participant,
      stage: { id: 4, name: 'Regular Season' }
    }
  }
}

function fixture(
  id: number,
  startingAt: number,
  participants: CachedFixture['raw']['participants'] = []
): CachedFixture {
  return {
    id,
    leagueId: 8,
    seasonId: 23614,
    stateId: 1,
    startingAt,
    name: null,
    resultInfo: null,
    placeholder: false,
    hasOdds: false,
    homeTeamId: null,
    awayTeamId: null,
    raw: {
      id,
      league_id: 8,
      season_id: 23614,
      state_id: 1,
      placeholder: false,
      has_odds: false,
      participants,
      scores: []
    },
    fetchedAt: 0,
    staleAt: 0
  }
}
