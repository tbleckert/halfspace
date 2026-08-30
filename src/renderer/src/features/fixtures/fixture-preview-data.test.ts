import { describe, expect, it } from 'vitest'
import type { SportmonksFixture, SportmonksParticipant } from '@shared/contracts'
import type { CachedFixture, CachedStanding } from '@/data/db'
import {
  fixtureOutcome,
  fixturePreviewTeamInput,
  recentHeadToHead,
  recentTeamFixtures,
  standingForParticipant
} from './fixture-preview-data'

describe('fixture preview data', () => {
  it('requests the 100 days before kickoff for team form', () => {
    expect(fixturePreviewTeamInput(11, Date.UTC(2026, 7, 30, 22, 30), 'Europe/Stockholm')).toEqual({
      teamId: 11,
      startDate: '2026-05-23',
      endDate: '2026-08-30',
      timeZone: 'Europe/Stockholm'
    })
  })

  it('keeps the five most recent finished fixtures before kickoff', () => {
    const kickoff = Date.UTC(2026, 7, 31, 18)
    const fixtures = [
      fixture(1, 5, kickoff - 1_000),
      fixture(2, 1, kickoff - 2_000),
      fixture(3, 7, kickoff - 3_000),
      fixture(4, 8, kickoff - 4_000),
      fixture(5, 5, kickoff - 5_000),
      fixture(6, 5, kickoff - 6_000),
      fixture(7, 5, kickoff - 7_000),
      fixture(8, 5, kickoff + 1_000)
    ]

    expect(recentTeamFixtures(fixtures, 11, 99, kickoff).map(({ id }) => id)).toEqual([
      1, 3, 4, 5, 6
    ])
  })

  it('does not include the current fixture in previous meetings', () => {
    const kickoff = Date.UTC(2026, 7, 31, 18)
    const fixtures = [fixture(99, 5, kickoff - 1_000), fixture(2, 5, kickoff - 2_000)]

    expect(recentHeadToHead(fixtures, 99, kickoff).map(({ id }) => id)).toEqual([2])
  })

  it('derives the team result from winner metadata or the current score', () => {
    const win = fixture(1, 5, 1, [participant(11, 'home', true), participant(22, 'away', false)])
    const draw = fixture(2, 5, 1)
    draw.raw.scores = [
      {
        id: 1,
        participant_id: 11,
        description: 'CURRENT',
        score: { goals: 2, participant: 'home' }
      },
      {
        id: 2,
        participant_id: 22,
        description: 'CURRENT',
        score: { goals: 2, participant: 'away' }
      }
    ]
    const loss = fixture(3, 5, 1)
    loss.raw.scores = [
      {
        id: 3,
        participant_id: 11,
        description: 'CURRENT',
        score: { goals: 0, participant: 'home' }
      },
      {
        id: 4,
        participant_id: 22,
        description: 'CURRENT',
        score: { goals: 1, participant: 'away' }
      }
    ]

    expect(fixtureOutcome(win, 11)).toBe('W')
    expect(fixtureOutcome(draw, 11)).toBe('D')
    expect(fixtureOutcome(loss, 11)).toBe('L')
  })

  it('prefers the overall standing for a participant', () => {
    const group = standing(1, 11, 2, 'Group A')
    const overall = standing(2, 11, 4, 'overall')

    expect(standingForParticipant([group, overall], 11)?.id).toBe(2)
  })
})

function fixture(
  id: number,
  stateId: number,
  startingAt: number,
  participants = [participant(11, 'home'), participant(22, 'away')]
): CachedFixture {
  const raw = {
    id,
    league_id: 8,
    season_id: 23614,
    state_id: stateId,
    starting_at_timestamp: Math.floor(startingAt / 1_000),
    placeholder: false,
    has_odds: false,
    participants,
    scores: []
  } satisfies SportmonksFixture

  return {
    id,
    leagueId: 8,
    seasonId: 23614,
    stateId,
    startingAt,
    name: null,
    resultInfo: null,
    placeholder: false,
    hasOdds: false,
    homeTeamId: 11,
    awayTeamId: 22,
    raw,
    fetchedAt: 1,
    staleAt: 2
  }
}

function participant(
  id: number,
  location: 'home' | 'away',
  winner?: boolean
): SportmonksParticipant {
  return { id, name: `Team ${id}`, meta: { location, winner } }
}

function standing(
  id: number,
  participantId: number,
  position: number,
  result: string
): CachedStanding {
  return {
    id,
    participantId,
    leagueId: 8,
    seasonId: 23614,
    stageId: 1,
    groupId: null,
    position,
    fetchedAt: 1,
    raw: {
      id,
      participant_id: participantId,
      league_id: 8,
      season_id: 23614,
      stage_id: 1,
      group_id: null,
      round_id: null,
      standing_rule_id: null,
      position,
      result,
      points: 10
    }
  }
}
