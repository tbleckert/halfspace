import { afterAll, beforeEach, expect, it } from 'vitest'
import type { SportmonksPlayer, SportmonksTeam, SportmonksFixture } from '@shared/contracts'
import {
  clearSportmonksCache,
  db,
  writePlayerRefresh,
  writeTeamRefresh,
  writeEntitySearchRefresh,
  writeFixtureDetailRefresh,
  writeFixtureRefresh,
  writeCoachRefresh
} from './db'

const player: SportmonksPlayer = {
  id: 10,
  sport_id: 1,
  country_id: null,
  nationality_id: null,
  city_id: null,
  position_id: null,
  detailed_position_id: null,
  type_id: null,
  name: 'Player',
  display_name: 'Player',
  height: null,
  weight: null,
  date_of_birth: null,
  gender: null
}
const team: SportmonksTeam = {
  id: 9,
  sport_id: 1,
  country_id: null,
  venue_id: null,
  gender: null,
  name: 'Club',
  founded: null,
  placeholder: false
}
const fixture: SportmonksFixture = {
  id: 50,
  league_id: 8,
  season_id: 1,
  state_id: 5,
  placeholder: false,
  has_odds: false,
  participants: [],
  scores: []
}

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

it('caches registration and pending club identities without changing squads or transfer history', async () => {
  await writeTeamRefresh({ team: { ...team, name: 'Detailed club', socials: [] }, fetchedAt: 300 })
  const enriched: SportmonksPlayer = {
    ...player,
    city: { id: 1, name: 'Leeds' },
    metadata: [{ id: 1, type_id: 229, values: 'left' }],
    teams: [
      { id: 1, player_id: 10, team_id: 9, start: null, end: '2034-06-30', jersey_number: 9, team }
    ],
    pendingTransfers: [
      {
        id: 1,
        sport_id: 1,
        player_id: 10,
        type_id: 1,
        position_id: null,
        detailed_position_id: null,
        from_team_id: 9,
        to_team_id: 11,
        date: '2027-01-01',
        career_ended: false,
        completed: false,
        amount: null,
        fromTeam: team,
        toTeam: { ...team, id: 11 }
      }
    ]
  }
  await writePlayerRefresh({ player: enriched, fetchedAt: 200 })
  expect((await db.teams.get(9))?.name).toBe('Detailed club')
  expect((await db.teams.get(11))?.name).toBe('Club')
  expect(await db.squadEntries.count()).toBe(0)
  expect(await db.transfers.count()).toBe(0)
  await writeEntitySearchRefresh({
    players: [player],
    teams: [],
    coaches: [],
    referees: [],
    venues: [],
    competitions: [],
    fixtures: [],
    fetchedAt: 400
  })
  expect((await db.players.get(10))?.raw).toMatchObject({
    city: { name: 'Leeds' },
    metadata: enriched.metadata,
    teams: enriched.teams,
    pendingTransfers: enriched.pendingTransfers
  })
  await writePlayerRefresh({ player, fetchedAt: 100 })
  expect((await db.players.get(10))?.raw.pendingTransfers).toHaveLength(1)
  await writePlayerRefresh({
    player: { ...enriched, teams: [], pendingTransfers: [] },
    fetchedAt: 500
  })
  expect((await db.players.get(10))?.raw.pendingTransfers).toEqual([])
  expect((await db.teams.get(11))?.name).toBe('Club')
  await clearSportmonksCache()
  expect(await db.players.count()).toBe(0)
})

it('hydrates a linked coach playing identity without replacing a detailed player', async () => {
  await writePlayerRefresh({
    player: { ...player, city: { id: 1, name: 'Leeds' } },
    fetchedAt: 300
  })
  await writeCoachRefresh({
    coach: { ...player, teams: [], player_id: 10, player },
    fetchedAt: 200
  })
  expect((await db.players.get(10))?.raw.city?.name).toBe('Leeds')
  expect((await db.coaches.get(10))?.raw.player?.id).toBe(10)
})

it('retains match formations and tie context through list refreshes and clears reported removals', async () => {
  const enriched: SportmonksFixture = {
    ...fixture,
    formations: [{ id: 1, fixture_id: 50, participant_id: 9, formation: '4-2-3-1' }],
    group: { id: 1, name: 'Group A' },
    aggregate: {
      id: 1,
      league_id: 8,
      season_id: 1,
      stage_id: 2,
      fixture_ids: [49, 50],
      name: 'Tie',
      result: '3-2',
      detail: null,
      winner_participant_id: 9
    }
  }
  await writeFixtureDetailRefresh({ fixture: enriched, fetchedAt: 100 })
  await writeFixtureRefresh('2026-09-06', 'UTC', {
    fixtures: [fixture],
    timeZone: 'UTC',
    fetchedAt: 200,
    pageCount: 1
  })
  expect((await db.fixtures.get(50))?.raw).toMatchObject({
    formations: enriched.formations,
    group: enriched.group,
    aggregate: enriched.aggregate
  })
  await writeFixtureDetailRefresh({
    fixture: { ...fixture, group: null, aggregate: null, formations: [] },
    fetchedAt: 300
  })
  expect((await db.fixtures.get(50))?.raw).toMatchObject({
    group: null,
    aggregate: null,
    formations: []
  })
})
