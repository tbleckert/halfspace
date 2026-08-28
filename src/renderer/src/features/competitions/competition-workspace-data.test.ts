import { describe, expect, it } from 'vitest'
import type { CachedFixture, CachedStanding } from '@/data/db'
import {
  groupStandings,
  nearestFixtureSeasonId,
  splitCompetitionFixtures
} from './competition-workspace-data'

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

    const split = splitCompetitionFixtures(fixtures, now)

    expect(split.recent.map(({ id }) => id)).toEqual([6, 5, 4, 3, 2])
    expect(split.upcoming.map(({ id }) => id)).toEqual([7, 8, 9, 10, 11])
    expect(nearestFixtureSeasonId(fixtures, now)).toBe(23614)
  })
})

function standing(id: number, position: number, result: string): CachedStanding {
  return {
    id,
    participantId: id,
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
      stage: { id: 4, name: 'Regular Season' }
    }
  }
}

function fixture(id: number, startingAt: number): CachedFixture {
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
      participants: [],
      scores: []
    },
    fetchedAt: 0,
    staleAt: 0
  }
}
