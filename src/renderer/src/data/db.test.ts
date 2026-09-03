import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import type {
  CoachRefresh,
  CompetitionRefresh,
  CompetitionSeasonsRefresh,
  EntitySearchRefresh,
  FixtureDetailRefresh,
  FixtureOddsRefresh,
  FixtureRefresh,
  PlayerAppearancesRefresh,
  PlayerRefresh,
  PlayerStatisticsRefresh,
  TransfersRefresh,
  RefreshCompetitionFixturesInput,
  RefreshFixtureHeadToHeadInput,
  RefreshPlayerAppearancesInput,
  RefreshTeamFixturesInput,
  SeasonStatisticsRefresh,
  StandingsRefresh,
  SportmonksPlayer,
  SportmonksTeam,
  TeamRefresh,
  TeamSquadRefresh,
  TeamStatisticsRefresh,
  VenueRefresh
} from '@shared/contracts'
import {
  db,
  readCompetitionCatalog,
  readCoachIdentity,
  readCompetitionSeasons,
  readCompetitionFixtureQuery,
  readEntitySearch,
  readFixtureQuery,
  readFixtureOdds,
  readFixtureHeadToHead,
  readPlayerAppearanceQuery,
  readPlayerIdentity,
  readPlayerStatistics,
  readPlayerTransfers,
  readSeasonStatistics,
  readStandingsQuery,
  readTeamFixtureQuery,
  readTeamIdentity,
  readTeamSquad,
  readTeamStatistics,
  readTeamTransfers,
  readVenueIdentity,
  readVenueTeams,
  setCompetitionPinned,
  writeCompetitionFixtureRefresh,
  writeCoachRefresh,
  writeCompetitionRefresh,
  writeCompetitionSeasonsRefresh,
  writeEntitySearchRefresh,
  writeFixtureDetailRefresh,
  writeFixtureOddsRefresh,
  writeFixtureHeadToHeadRefresh,
  writeFixtureRefresh,
  writeFixtureWindowRefresh,
  writePlayerAppearancesRefresh,
  writePlayerRefresh,
  writePlayerStatisticsRefresh,
  writePlayerTransfersRefresh,
  writeSeasonStatisticsRefresh,
  writeStandingsRefresh,
  writeTeamFixtureRefresh,
  writeTeamRefresh,
  writeTeamSquadRefresh,
  writeTeamStatisticsRefresh,
  writeTeamTransfersRefresh,
  writeVenueRefresh
} from './db'

beforeEach(async () => {
  if (!db.isOpen()) await db.open()

  await db.transaction(
    'rw',
    [
      db.fixtures,
      db.fixtureQueries,
      db.fixtureOdds,
      db.fixtureOddsQueries,
      db.fixtureHeadToHeadQueries,
      db.competitions,
      db.competitionCatalogs,
      db.competitionPins,
      db.competitionSeasonQueries,
      db.standings,
      db.standingQueries,
      db.seasonStatisticsQueries,
      db.competitionFixtureQueries,
      db.teams,
      db.teamFixtureQueries,
      db.teamStatisticsQueries,
      db.venues,
      db.players,
      db.coaches,
      db.squadEntries,
      db.teamSquadQueries,
      db.teamSeasonSquadQueries,
      db.playerAppearances,
      db.playerAppearanceQueries,
      db.playerStatisticsQueries,
      db.transfers,
      db.playerTransferQueries,
      db.teamTransferQueries
    ],
    async () => {
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.fixtureOdds.clear()
      await db.fixtureOddsQueries.clear()
      await db.fixtureHeadToHeadQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
      await db.competitionPins.clear()
      await db.competitionSeasonQueries.clear()
      await db.standings.clear()
      await db.standingQueries.clear()
      await db.seasonStatisticsQueries.clear()
      await db.competitionFixtureQueries.clear()
      await db.teams.clear()
      await db.teamFixtureQueries.clear()
      await db.teamStatisticsQueries.clear()
      await db.venues.clear()
      await db.players.clear()
      await db.coaches.clear()
      await db.squadEntries.clear()
      await db.teamSquadQueries.clear()
      await db.teamSeasonSquadQueries.clear()
      await db.playerAppearances.clear()
      await db.playerAppearanceQueries.clear()
      await db.playerStatisticsQueries.clear()
      await db.transfers.clear()
      await db.playerTransferQueries.clear()
      await db.teamTransferQueries.clear()
    }
  )
})

afterAll(() => db.close())

describe('entity search cache', () => {
  it('retains team detail written while a search refresh is being prepared', async () => {
    await writeTeamRefresh(teamRefresh())
    const detail = teamRefresh()
    detail.team.sidelined = []
    detail.team.country = { id: 462, name: 'England' }
    beforeNextCacheTransaction(() => writeTeamRefresh(detail))

    await writeEntitySearchRefresh({
      teams: [teamRefresh().team],
      competitions: [],
      players: [],
      coaches: [],
      venues: [],
      fetchedAt: detail.fetchedAt + 1_000
    })

    expect((await readTeamIdentity(9)).team?.raw.country?.name).toBe('England')
    expect((await readTeamIdentity(9)).team?.raw.sidelined).toEqual([])
  })

  it('retains cached absences when a basic team search result arrives', async () => {
    const refresh = teamRefresh()
    refresh.team.sidelined = [
      {
        id: 1,
        player_id: 6306068,
        team_id: 9,
        season_id: null,
        type_id: 500,
        category: 'injury',
        start_date: '2026-08-10',
        end_date: null,
        completed: false,
        games_missed: 3,
        type: { id: 500, name: 'Ankle injury' },
        player: basePlayer()
      }
    ]
    await writeTeamRefresh(refresh)
    await writeEntitySearchRefresh({
      teams: [teamRefresh().team],
      competitions: [],
      players: [],
      coaches: [],
      venues: [],
      fetchedAt: Date.now()
    })
    expect((await readTeamIdentity(9)).team?.raw.sidelined?.[0].type?.name).toBe('Ankle injury')
    expect((await readPlayerIdentity(6306068)).player?.displayName).toBe('Quinten Timber')
  })

  it('ranks cached entities and hydrates remote results without replacing the subscription catalog', async () => {
    const fetchedAt = Date.UTC(2026, 7, 29, 10)
    const subscribedCompetition: CompetitionRefresh = {
      fetchedAt,
      pageCount: 1,
      competitions: [
        {
          id: 8,
          country_id: 462,
          name: 'Premier League',
          active: true,
          country: { id: 462, name: 'England' }
        }
      ]
    }
    const searchRefresh: EntitySearchRefresh = {
      fetchedAt: fetchedAt + 1,
      competitions: [
        {
          id: 301,
          country_id: 462,
          name: 'Manchester Premier Cup',
          active: true,
          country: { id: 462, name: 'England' }
        }
      ],
      teams: [
        {
          id: 9,
          sport_id: 1,
          country_id: 462,
          venue_id: 206,
          gender: 'male',
          name: 'Manchester City',
          founded: 1880,
          placeholder: false,
          country: { id: 462, name: 'England' }
        }
      ],
      players: [
        {
          id: 101,
          sport_id: 1,
          country_id: 462,
          nationality_id: 462,
          city_id: null,
          position_id: 26,
          detailed_position_id: null,
          type_id: 26,
          name: 'Manchester Player',
          display_name: 'Manchester Player',
          height: null,
          weight: null,
          date_of_birth: null,
          gender: 'male',
          nationality: { id: 462, name: 'England' },
          position: { id: 26, name: 'Midfielder' }
        }
      ],
      coaches: [
        {
          id: 7,
          player_id: null,
          sport_id: 1,
          country_id: 462,
          nationality_id: 462,
          city_id: null,
          name: 'Manchester Manager',
          display_name: 'Manchester Manager',
          height: null,
          weight: null,
          date_of_birth: null,
          gender: 'male',
          nationality: { id: 462, name: 'England' }
        }
      ],
      venues: [
        {
          id: 206,
          country_id: 462,
          name: 'Etihad Stadium',
          city_name: 'Manchester',
          country: { id: 462, name: 'England' }
        }
      ]
    }

    await writeCompetitionRefresh(subscribedCompetition)
    await writeEntitySearchRefresh(searchRefresh)

    const results = await readEntitySearch('manchester')
    const catalog = await readCompetitionCatalog()

    expect(results.map(({ type, name }) => `${type}:${name}`)).toEqual([
      'competition:Manchester Premier Cup',
      'team:Manchester City',
      'player:Manchester Player',
      'coach:Manchester Manager',
      'venue:Etihad Stadium'
    ])
    expect(catalog.catalog?.competitionIds).toEqual([8])
    expect(catalog.competitions.map(({ name }) => name)).toEqual(['Premier League'])
  })
})

describe('fixture cache', () => {
  it('does not let an older window response roll back a refreshed matchday', async () => {
    const older = fixtureRefresh(1, 'City vs Arsenal')
    older.fixtures[0].starting_at_timestamp = Date.UTC(2026, 7, 28, 18) / 1_000
    const newer = {
      ...older,
      fetchedAt: older.fetchedAt + 60_000,
      fixtures: [{ ...older.fixtures[0], state_id: 5 }]
    }
    await writeFixtureRefresh('2026-08-28', 'UTC', newer)
    await writeFixtureWindowRefresh(['2026-08-28'], 'UTC', older)

    const cached = await readFixtureQuery('2026-08-28', 'UTC')
    expect(cached.fixtures[0].stateId).toBe(5)
    expect(cached.query?.fetchedAt).toBe(newer.fetchedAt)
  })

  it('keeps newer fixture detail when an older competition request completes', async () => {
    const older = fixtureRefresh(1, 'City vs Arsenal')
    const fetchedAt = older.fetchedAt + 60_000
    await writeFixtureDetailRefresh({
      fetchedAt,
      fixture: { ...older.fixtures[0], state_id: 5, events: [] }
    })
    await writeCompetitionFixtureRefresh(
      {
        competitionId: 8,
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        timeZone: 'UTC'
      },
      older
    )

    const fixture = await db.fixtures.get(1)
    expect(fixture?.stateId).toBe(5)
    expect(fixture?.fetchedAt).toBe(fetchedAt)
  })
  it('writes the query and fixtures together while respecting participant locations', async () => {
    const refresh: FixtureRefresh = {
      fetchedAt: Date.UTC(2026, 7, 27, 10),
      pageCount: 1,
      timeZone: 'Europe/Stockholm',
      fixtures: [
        {
          id: 19425456,
          league_id: 8,
          season_id: 23614,
          state_id: 1,
          name: 'Away vs Home',
          starting_at_timestamp: 1_787_848_400,
          placeholder: false,
          has_odds: true,
          participants: [
            { id: 22, name: 'Away', meta: { location: 'away' } },
            { id: 11, name: 'Home', meta: { location: 'home' } }
          ],
          scores: []
        }
      ]
    }

    await writeFixtureRefresh('2026-08-27', 'Europe/Stockholm', refresh)
    const cached = await readFixtureQuery('2026-08-27', 'Europe/Stockholm')

    expect(cached.query?.fixtureIds).toEqual([19425456])
    expect(cached.fixtures[0]).toMatchObject({
      homeTeamId: 11,
      awayTeamId: 22
    })
  })

  it('caches an empty provider response', async () => {
    await writeFixtureRefresh('2026-08-28', 'UTC', {
      fetchedAt: Date.UTC(2026, 7, 27, 10),
      pageCount: 1,
      timeZone: 'UTC',
      fixtures: []
    })

    const cached = await readFixtureQuery('2026-08-28', 'UTC')
    expect(cached.query).not.toBeNull()
    expect(cached.fixtures).toEqual([])
  })

  it('splits one fixture-window response into the existing daily cache', async () => {
    const refresh = fixtureRefresh(19425456, 'Manchester City vs Arsenal')
    refresh.fixtures[0].starting_at_timestamp = Date.UTC(2026, 7, 28, 18) / 1_000
    refresh.fixtures.push({
      ...refresh.fixtures[0],
      id: 19425457,
      starting_at_timestamp: Date.UTC(2026, 7, 29, 18) / 1_000
    })

    await writeFixtureWindowRefresh(
      ['2026-08-28', '2026-08-29', '2026-08-30'],
      'Europe/Stockholm',
      refresh
    )

    expect((await readFixtureQuery('2026-08-28', 'Europe/Stockholm')).fixtures).toHaveLength(1)
    expect((await readFixtureQuery('2026-08-29', 'Europe/Stockholm')).fixtures).toHaveLength(1)
    expect((await readFixtureQuery('2026-08-30', 'Europe/Stockholm')).query).not.toBeNull()
  })

  it('keeps detailed match context when a fixture list refreshes', async () => {
    const detail: FixtureDetailRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      fixture: {
        ...fixtureRefresh(19425456, 'Manchester City vs Arsenal').fixtures[0],
        venue_id: 206,
        venue: { id: 206, name: 'Etihad Stadium' },
        lineups: [
          {
            id: 91,
            fixture_id: 19425456,
            player_id: 6306068,
            team_id: 9,
            position_id: 26,
            type_id: 11,
            player_name: 'Quinten Timber',
            jersey_number: 8
          }
        ],
        events: [
          {
            id: 501,
            fixture_id: 19425456,
            period_id: 1,
            participant_id: 9,
            type_id: 14,
            minute: 18,
            type: { id: 14, name: 'Goal' }
          }
        ],
        statistics: [
          {
            id: 601,
            fixture_id: 19425456,
            participant_id: 9,
            type_id: 42,
            data: { value: 12 },
            location: 'home',
            type: { id: 42, name: 'Shots' }
          }
        ],
        coaches: [{ ...coachIdentity(), meta: { fixture_id: 19425456, participant_id: 9 } }]
      }
    }

    await writeFixtureDetailRefresh(detail)
    await writeFixtureRefresh('2026-08-28', 'Europe/Stockholm', {
      ...fixtureRefresh(19425456, 'Updated score'),
      fetchedAt: Date.UTC(2026, 7, 28, 10, 5)
    })

    const fixture = await db.fixtures.get(19425456)
    expect(fixture?.name).toBe('Updated score')
    expect(fixture?.raw.venue?.name).toBe('Etihad Stadium')
    expect(fixture?.raw.lineups?.[0].player_name).toBe('Quinten Timber')
    expect(fixture?.raw.events?.[0].type?.name).toBe('Goal')
    expect(fixture?.raw.statistics?.[0].data.value).toBe(12)
    expect(fixture?.raw.coaches?.[0].display_name).toBe('Pep Guardiola')
    expect((await readCoachIdentity(7)).coach?.displayName).toBe('Pep Guardiola')
    expect(fixture?.detailStaleAt).toBeGreaterThan(detail.fetchedAt)
  })

  it('stores fixture odds as an on-demand cache', async () => {
    const refresh: FixtureOddsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      odds: [
        {
          id: 701,
          fixture_id: 19425456,
          market_id: 1,
          bookmaker_id: 2,
          label: 'Home',
          value: '1.80',
          market: { id: 1, name: 'Fulltime Result' },
          bookmaker: { id: 2, name: 'Nordic Bet' }
        }
      ]
    }

    await writeFixtureOddsRefresh(19425456, 'pre-match', refresh)

    const cached = await readFixtureOdds(19425456, 'pre-match')
    expect(cached.query?.oddIds).toEqual([701])
    expect(cached.odds[0].raw.market?.name).toBe('Fulltime Result')
  })

  it('removes obsolete odds even when another refresh commits while replacement is prepared', async () => {
    const refresh: FixtureOddsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      odds: [
        {
          id: 701,
          fixture_id: 19425456,
          market_id: 1,
          bookmaker_id: 2,
          label: 'Home',
          value: '1.80'
        }
      ]
    }
    await writeFixtureOddsRefresh(19425456, 'pre-match', refresh)
    beforeNextCacheTransaction(() =>
      writeFixtureOddsRefresh(19425456, 'pre-match', {
        ...refresh,
        fetchedAt: refresh.fetchedAt + 1_000,
        odds: [{ ...refresh.odds[0], id: 702 }]
      })
    )
    await writeFixtureOddsRefresh(19425456, 'pre-match', {
      ...refresh,
      fetchedAt: refresh.fetchedAt + 2_000,
      odds: [{ ...refresh.odds[0], id: 703 }]
    })
    expect((await readFixtureOdds(19425456, 'pre-match')).query?.oddIds).toEqual([703])
    expect(await db.fixtureOdds.toCollection().primaryKeys()).toEqual([703])
  })

  it('caches head-to-head fixtures under a canonical team pair', async () => {
    const input: RefreshFixtureHeadToHeadInput = {
      firstTeamId: 22,
      secondTeamId: 11,
      timeZone: 'Europe/Stockholm'
    }
    const refresh = fixtureRefresh(19425456, 'Manchester City vs Arsenal')

    await writeFixtureHeadToHeadRefresh(input, refresh)

    const cached = await readFixtureHeadToHead({
      firstTeamId: 11,
      secondTeamId: 22,
      timeZone: 'Europe/Stockholm'
    })
    expect(cached.query?.fixtureIds).toEqual([19425456])
    expect(cached.fixtures[0].name).toBe('Manchester City vs Arsenal')
  })

  it('refreshes live fixture details after thirty seconds', async () => {
    const fetchedAt = Date.UTC(2026, 7, 28, 10)
    const fixture = fixtureRefresh(19425456, 'Manchester City vs Arsenal').fixtures[0]

    await writeFixtureDetailRefresh({
      fetchedAt,
      fixture: { ...fixture, state_id: 2 }
    })

    expect((await db.fixtures.get(fixture.id))?.detailStaleAt).toBe(fetchedAt + 30_000)
  })

  it('replaces stale match context when the fixture entity refreshes', async () => {
    const fixture = fixtureRefresh(19425456, 'Manchester City vs Arsenal').fixtures[0]

    await writeFixtureDetailRefresh({
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      fixture: {
        ...fixture,
        venue_id: 206,
        venue: { id: 206, name: 'Etihad Stadium' },
        lineups: [
          {
            id: 91,
            fixture_id: fixture.id,
            player_id: 6306068,
            team_id: 9,
            position_id: 26,
            type_id: 11,
            player_name: 'Quinten Timber',
            jersey_number: 8
          }
        ]
      }
    })
    await writeFixtureDetailRefresh({
      fetchedAt: Date.UTC(2026, 7, 28, 10, 5),
      fixture: { ...fixture, venue_id: null, venue: null, lineups: [] }
    })

    const refreshed = await db.fixtures.get(fixture.id)
    expect(refreshed?.raw.venue).toBeNull()
    expect(refreshed?.raw.lineups).toEqual([])
  })
})

describe('competition cache', () => {
  it('retains discovered competitions when the subscription catalogue refreshes', async () => {
    await writeEntitySearchRefresh({
      competitions: competitionRefresh([{ id: 301, name: 'Ligue 1' }]).competitions,
      teams: [],
      players: [],
      coaches: [],
      venues: [],
      fetchedAt: Date.now()
    })
    await writeCompetitionRefresh(competitionRefresh([{ id: 8, name: 'Premier League' }]))

    expect((await readCompetitionCatalog()).competitions.map(({ id }) => id)).toEqual([8])
    expect((await readEntitySearch('Ligue 1')).map(({ id }) => id)).toEqual([301])
  })
  it('replaces the subscribed catalogue while preserving local pins', async () => {
    const firstRefresh = competitionRefresh([
      { id: 8, name: 'Premier League' },
      { id: 384, name: 'Serie A' }
    ])

    await writeCompetitionRefresh(firstRefresh)
    await setCompetitionPinned(384, true)
    await writeCompetitionRefresh(competitionRefresh([{ id: 384, name: 'Serie A' }]))

    const cached = await readCompetitionCatalog()
    expect(cached.competitions.map(({ id }) => id)).toEqual([384])
    expect(await db.competitionPins.get(384)).toMatchObject({ competitionId: 384 })
  })

  it('keeps the current season on the cached competition', async () => {
    const refresh = competitionRefresh([{ id: 8, name: 'Premier League' }])
    refresh.competitions[0].currentseason = {
      id: 23614,
      league_id: 8,
      name: '2026/2027',
      is_current: true
    }

    await writeCompetitionRefresh(refresh)

    expect((await db.competitions.get(8))?.currentSeasonId).toBe(23614)
  })
})

describe('competition workspace cache', () => {
  it('writes and reads the season catalogue for one competition', async () => {
    const refresh: CompetitionSeasonsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 29, 10),
      pageCount: 1,
      seasons: [
        {
          id: 23614,
          league_id: 8,
          name: '2026/2027',
          is_current: true,
          starting_at: '2026-08-01',
          ending_at: '2027-05-31'
        },
        {
          id: 21646,
          league_id: 8,
          name: '2025/2026',
          is_current: false,
          starting_at: '2025-08-01',
          ending_at: '2026-05-31'
        }
      ]
    }

    await writeCompetitionSeasonsRefresh(8, refresh)

    expect((await readCompetitionSeasons(8))?.seasons.map(({ id }) => id)).toEqual([23614, 21646])
  })

  it('writes and reads a season standings snapshot', async () => {
    const refresh: StandingsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      standings: [
        {
          id: 1,
          participant_id: 10,
          league_id: 8,
          season_id: 23614,
          stage_id: 1,
          group_id: null,
          round_id: null,
          standing_rule_id: 1,
          position: 1,
          result: 'overall',
          points: 84,
          participant: { id: 10, name: 'Home' }
        }
      ]
    }

    await writeStandingsRefresh(23614, refresh)
    const cached = await readStandingsQuery(23614)

    expect(cached.query?.standingIds).toEqual([1])
    expect(cached.standings[0].raw.participant?.name).toBe('Home')
    expect((await readTeamIdentity(10)).participant?.name).toBe('Home')
  })

  it('writes and reads season statistics independently from standings', async () => {
    const refresh: SeasonStatisticsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 30, 10),
      statistics: [
        {
          id: 701,
          model_id: 23614,
          type_id: 191,
          relation_id: null,
          value: { total: 92 }
        }
      ]
    }

    await writeSeasonStatisticsRefresh(23614, refresh)

    expect((await readSeasonStatistics(23614))?.statistics[0].value).toEqual({ total: 92 })
  })

  it('reuses normalized fixtures for a competition range', async () => {
    const input: RefreshCompetitionFixturesInput = {
      competitionId: 8,
      startDate: '2026-08-14',
      endDate: '2026-09-11',
      timeZone: 'Europe/Stockholm'
    }
    const refresh = fixtureRefresh(19425456, 'Original')

    await writeFixtureRefresh('2026-08-28', 'Europe/Stockholm', refresh)
    await writeCompetitionFixtureRefresh(input, {
      ...refresh,
      fixtures: [{ ...refresh.fixtures[0], name: 'Updated' }]
    })

    const cached = await readCompetitionFixtureQuery(input)
    expect(cached.fixtures[0].name).toBe('Updated')
    expect(await db.fixtures.count()).toBe(1)
  })
})

describe('team entity cache', () => {
  it('writes and reads a detailed team entity', async () => {
    const refresh: TeamRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      team: {
        id: 9,
        sport_id: 1,
        country_id: 462,
        venue_id: 206,
        gender: 'male',
        name: 'Manchester City',
        short_code: 'MCI',
        image_path: 'https://cdn.sportmonks.com/images/soccer/teams/9/9.png',
        founded: 1880,
        placeholder: false,
        country: { id: 462, name: 'England' },
        venue: { id: 206, name: 'Etihad Stadium', capacity: 55097 },
        coaches: [
          {
            id: 501,
            team_id: 9,
            coach_id: 7,
            position_id: 1,
            active: true,
            start: '2016-07-01',
            end: null,
            temporary: false,
            coach: coachIdentity()
          }
        ]
      }
    }

    await writeTeamRefresh(refresh)
    const identity = await readTeamIdentity(9)

    expect(identity.team?.name).toBe('Manchester City')
    expect(identity.team?.raw.venue?.name).toBe('Etihad Stadium')
    expect((await readCoachIdentity(7)).coach?.displayName).toBe('Pep Guardiola')
    expect((await readVenueIdentity(206)).summary?.name).toBe('Etihad Stadium')
  })

  it('reuses normalized fixtures for a team range', async () => {
    const input: RefreshTeamFixturesInput = {
      teamId: 9,
      startDate: '2026-08-14',
      endDate: '2026-09-11',
      timeZone: 'Europe/Stockholm'
    }
    const refresh = fixtureRefresh(19425456, 'Original')
    refresh.fixtures[0].participants = [
      { id: 9, name: 'Manchester City', meta: { location: 'home' } },
      { id: 10, name: 'Away', meta: { location: 'away' } }
    ]

    await writeFixtureRefresh('2026-08-28', 'Europe/Stockholm', refresh)
    await writeTeamFixtureRefresh(input, {
      ...refresh,
      fixtures: [{ ...refresh.fixtures[0], name: 'Updated' }]
    })

    const cached = await readTeamFixtureQuery(input)
    expect(cached.fixtures[0].name).toBe('Updated')
    expect(await db.fixtures.count()).toBe(1)
  })

  it('writes and reads team statistics for one season', async () => {
    const refresh: TeamStatisticsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 30, 10),
      statistics: [
        {
          id: 801,
          team_statistic_id: 501,
          type_id: 214,
          value: { count: 12 }
        }
      ]
    }

    await writeTeamStatisticsRefresh({ seasonId: 23614, teamId: 9 }, refresh)

    expect((await readTeamStatistics({ seasonId: 23614, teamId: 9 }))?.statistics[0].value).toEqual(
      { count: 12 }
    )
  })

  it('normalizes a coach profile and its complete club history', async () => {
    const refresh: CoachRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      coach: {
        ...coachIdentity(),
        nationality: { id: 462, name: 'Spain' },
        teams: [
          {
            id: 501,
            team_id: 9,
            coach_id: 7,
            position_id: 1,
            active: true,
            start: '2016-07-01',
            end: null,
            temporary: false,
            team: teamRefresh().team
          }
        ]
      }
    }

    await writeCoachRefresh(refresh)

    const identity = await readCoachIdentity(7)
    expect(identity.coach?.detailed).toBe(true)
    expect(identity.coach?.raw.nationality?.name).toBe('Spain')
    expect(identity.teams[0].team.name).toBe('Manchester City')
    expect(identity.teams[0].assignment.active).toBe(true)
  })
})

describe('included coach cache', () => {
  it.each(['team', 'fixture', 'search'] as const)(
    'retains concurrent coach detail during a %s refresh',
    async (source) => {
      beforeNextCacheTransaction(() =>
        writeCoachRefresh({
          fetchedAt: Date.UTC(2026, 7, 28, 10),
          coach: { ...coachIdentity(), teams: [], nationality: { id: 462, name: 'Spain' } }
        })
      )

      if (source === 'team') {
        const refresh = teamRefresh()
        refresh.team.coaches = [
          {
            id: 501,
            team_id: 9,
            coach_id: 7,
            position_id: 1,
            active: true,
            start: '2016-07-01',
            end: null,
            temporary: false,
            coach: coachIdentity()
          }
        ]
        await writeTeamRefresh(refresh)
      } else if (source === 'fixture') {
        const refresh = fixtureRefresh(19425456, 'Manchester City vs Arsenal')
        await writeFixtureDetailRefresh({
          fetchedAt: refresh.fetchedAt,
          fixture: { ...refresh.fixtures[0], coaches: [coachIdentity()] }
        })
      } else {
        await writeEntitySearchRefresh({
          fetchedAt: Date.UTC(2026, 7, 28, 10),
          competitions: [],
          teams: [],
          players: [],
          venues: [],
          coaches: [coachIdentity()]
        })
      }

      const coach = (await readCoachIdentity(7)).coach
      expect(coach?.detailed).toBe(true)
      expect(coach?.raw.teams).toEqual([])
      expect(coach?.raw.nationality?.name).toBe('Spain')
    }
  )
})

describe('squad and player cache', () => {
  it.each([undefined, 100])(
    'retains a concurrent player detail refresh for squad season %s',
    async (seasonId) => {
      beforeNextCacheTransaction(() => writePlayerRefresh(playerRefresh()))
      await writeTeamSquadRefresh(9, teamSquadRefresh(), seasonId)

      const player = (await readPlayerIdentity(6306068)).player
      expect(player?.detailed).toBe(true)
      expect(player?.raw.nationality?.name).toBe('Netherlands')
    }
  )

  it('keeps season rosters separate from each other and current membership', async () => {
    await writeTeamSquadRefresh(9, teamSquadRefresh())
    const historical = teamSquadRefresh()
    historical.squad[0].jersey_number = 42
    await writeTeamSquadRefresh(9, historical, 100)
    await writeTeamSquadRefresh(9, { ...historical, squad: [] }, 101)

    expect((await readTeamSquad(9)).members[0].entry.jerseyNumber).toBe(8)
    expect((await readTeamSquad(9, 100)).members[0].entry.jerseyNumber).toBe(42)
    expect((await readTeamSquad(9, 101)).members).toEqual([])
    expect((await readTeamSquad(9, 100)).query?.seasonId).toBe(100)
    expect(await db.squadEntries.count()).toBe(1)
  })

  it('normalizes the current squad into player and team membership records', async () => {
    await writeTeamRefresh(teamRefresh())
    await writeTeamSquadRefresh(9, teamSquadRefresh())

    const squad = await readTeamSquad(9)
    const player = await readPlayerIdentity(6306068)

    expect(squad.members[0].entry).toMatchObject({
      jerseyNumber: 8,
      positionName: 'Midfielder'
    })
    expect(squad.members[0].player.displayName).toBe('Quinten Timber')
    expect(player.teams.map(({ name }) => name)).toEqual(['Manchester City'])
  })

  it('keeps detailed player relations when the squad refreshes basic identity', async () => {
    await writePlayerRefresh(playerRefresh())
    await writeTeamSquadRefresh(9, teamSquadRefresh())

    const player = (await readPlayerIdentity(6306068)).player

    expect(player?.detailed).toBe(true)
    expect(player?.raw.nationality?.name).toBe('Netherlands')
  })

  it('stores lineup-backed appearances against normalized fixtures', async () => {
    const input: RefreshPlayerAppearancesInput = {
      playerId: 6306068,
      teamId: 9,
      startDate: '2026-05-30',
      endDate: '2026-08-28',
      timeZone: 'Europe/Stockholm'
    }
    const fixture = fixtureRefresh(19425456, 'Manchester City vs Arsenal').fixtures[0]
    const refresh: PlayerAppearancesRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      pageCount: 1,
      timeZone: 'Europe/Stockholm',
      appearances: [
        {
          fixture,
          lineup: {
            id: 91,
            fixture_id: fixture.id,
            player_id: 6306068,
            team_id: 9,
            position_id: 26,
            type_id: 11,
            player_name: 'Quinten Timber',
            jersey_number: 8
          }
        }
      ]
    }

    await writePlayerAppearancesRefresh(input, refresh)
    const cached = await readPlayerAppearanceQuery(input)

    expect(cached.query?.appearanceKeys).toEqual(['6306068|19425456'])
    expect(cached.appearances[0].appearance.lineup.type_id).toBe(11)
    expect(cached.appearances[0].fixture.name).toBe('Manchester City vs Arsenal')
  })

  it('writes and reads player statistics for one season', async () => {
    const refresh: PlayerStatisticsRefresh = {
      fetchedAt: Date.UTC(2026, 7, 30, 10),
      statistics: [
        {
          id: 501,
          player_id: 6306068,
          team_id: 9,
          season_id: 23614,
          has_values: true,
          position_id: 26,
          jersey_number: 8,
          details: [
            {
              id: 801,
              player_statistic_id: 501,
              type_id: 52,
              value: { total: 9 }
            }
          ]
        }
      ]
    }

    await writePlayerStatisticsRefresh({ playerId: 6306068, seasonId: 23614 }, refresh)

    expect(
      (await readPlayerStatistics({ playerId: 6306068, seasonId: 23614 }))?.statistics[0].details[0]
        .value
    ).toEqual({ total: 9 })
  })

  it('stores a player career against normalized transfers and teams', async () => {
    const refresh: TransfersRefresh = {
      fetchedAt: Date.UTC(2026, 8, 1, 10),
      pageCount: 1,
      transfers: [
        {
          id: 184008,
          sport_id: 1,
          player_id: 6306068,
          type_id: 218,
          from_team_id: 2345,
          to_team_id: 9,
          position_id: 26,
          detailed_position_id: 153,
          date: '2023-07-01',
          career_ended: false,
          completed: true,
          amount: null,
          type: { id: 218, name: 'Transfer' },
          fromTeam: transferTeam(2345, 'Feyenoord'),
          toTeam: transferTeam(9, 'Manchester City')
        }
      ]
    }

    await writePlayerTransfersRefresh({ playerId: 6306068 }, refresh)
    const cached = await readPlayerTransfers({ playerId: 6306068 })

    expect(cached.query?.transferIds).toEqual([184008])
    expect(cached.transfers[0].raw.fromTeam?.name).toBe('Feyenoord')
    expect((await db.teams.get(2345))?.name).toBe('Feyenoord')
  })

  it('stores team transfers against normalized players and teams', async () => {
    const refresh: TransfersRefresh = {
      fetchedAt: Date.UTC(2026, 8, 1, 10),
      pageCount: 1,
      transfers: [
        {
          id: 184009,
          sport_id: 1,
          player_id: 6306068,
          type_id: 218,
          from_team_id: 2345,
          to_team_id: 9,
          position_id: 26,
          detailed_position_id: 153,
          date: '2024-07-30',
          career_ended: false,
          completed: true,
          amount: null,
          player: basePlayer(),
          type: { id: 218, name: 'Transfer' },
          fromTeam: transferTeam(2345, 'Feyenoord'),
          toTeam: transferTeam(9, 'Manchester City')
        }
      ]
    }

    await writeTeamTransfersRefresh({ teamId: 9 }, refresh)
    const cached = await readTeamTransfers({ teamId: 9 })

    expect(cached.query?.transferIds).toEqual([184009])
    expect(cached.transfers[0].raw.player?.display_name).toBe('Quinten Timber')
    expect((await db.players.get(6306068))?.displayName).toBe('Quinten Timber')
    expect((await db.teams.get(2345))?.name).toBe('Feyenoord')
  })
})

describe('venue entity cache', () => {
  it('writes and reads a detailed venue entity', async () => {
    const refresh: VenueRefresh = {
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      venue: {
        id: 206,
        country_id: 462,
        city_id: 28146,
        name: 'Etihad Stadium',
        address: 'Rowsley Street',
        zipcode: 'M11 3FF',
        latitude: '53.483111',
        longitude: '-2.200397',
        capacity: 55097,
        image_path: 'https://cdn.sportmonks.com/images/soccer/venues/14/206.png',
        city_name: 'Manchester',
        surface: 'grass',
        national_team: false,
        country: { id: 462, name: 'England' }
      }
    }

    await writeVenueRefresh(refresh)
    const identity = await readVenueIdentity(206)

    expect(identity.venue?.name).toBe('Etihad Stadium')
    expect(identity.venue?.raw.country?.name).toBe('England')
  })

  it('finds cached teams that use the venue', async () => {
    await writeTeamRefresh({
      fetchedAt: Date.UTC(2026, 7, 28, 10),
      team: {
        id: 9,
        sport_id: 1,
        country_id: 462,
        venue_id: 206,
        gender: 'male',
        name: 'Manchester City',
        founded: 1880,
        placeholder: false
      }
    })

    expect((await readVenueTeams(206)).map(({ name }) => name)).toEqual(['Manchester City'])
  })
})

function competitionRefresh(competitions: Array<{ id: number; name: string }>): CompetitionRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    pageCount: 1,
    competitions: competitions.map(({ id, name }) => ({
      id,
      country_id: 1,
      name,
      active: true,
      image_path: `https://cdn.sportmonks.com/images/soccer/leagues/${id}.png`
    }))
  }
}

function fixtureRefresh(id: number, name: string): FixtureRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    pageCount: 1,
    timeZone: 'Europe/Stockholm',
    fixtures: [
      {
        id,
        league_id: 8,
        season_id: 23614,
        state_id: 1,
        name,
        starting_at_timestamp: 1_787_848_400,
        placeholder: false,
        has_odds: false,
        participants: [],
        scores: []
      }
    ]
  }
}

function beforeNextCacheTransaction(update: () => Promise<void>): void {
  const transaction = db.transaction.bind(db)
  const nextTransaction = vi.spyOn(db, 'transaction')
  nextTransaction.mockImplementationOnce((...args) => {
    nextTransaction.mockRestore()
    return Dexie.Promise.resolve(update()).then(() => transaction(...args))
  })
}

function coachIdentity(): CoachRefresh['coach'] {
  return {
    id: 7,
    player_id: null,
    sport_id: 1,
    country_id: 462,
    nationality_id: 462,
    city_id: null,
    name: 'Josep Guardiola i Sala',
    display_name: 'Pep Guardiola',
    image_path: 'https://cdn.sportmonks.com/images/soccer/coaches/7/7.png',
    height: 180,
    weight: null,
    date_of_birth: '1971-01-18',
    gender: 'male'
  }
}

function teamRefresh(): TeamRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    team: {
      id: 9,
      sport_id: 1,
      country_id: 462,
      venue_id: 206,
      gender: 'male',
      name: 'Manchester City',
      founded: 1880,
      placeholder: false
    }
  }
}

function transferTeam(id: number, name: string): SportmonksTeam {
  return {
    id,
    sport_id: 1,
    country_id: 462,
    venue_id: null,
    gender: 'male',
    name,
    founded: 1880,
    placeholder: false
  }
}

function teamSquadRefresh(): TeamSquadRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    squad: [
      {
        id: 635741,
        transfer_id: 184008,
        player_id: 6306068,
        team_id: 9,
        position_id: 26,
        detailed_position_id: 153,
        jersey_number: 8,
        start: '2025-07-01',
        end: null,
        position: { id: 26, name: 'Midfielder' },
        detailedPosition: { id: 153, name: 'Central Midfield' },
        player: basePlayer()
      }
    ]
  }
}

function playerRefresh(): PlayerRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 9),
    player: {
      ...basePlayer(),
      nationality: { id: 38, name: 'Netherlands', iso2: 'NL' },
      position: { id: 26, name: 'Midfielder' },
      detailedPosition: { id: 153, name: 'Central Midfield' }
    }
  }
}

function basePlayer(): SportmonksPlayer {
  return {
    id: 6306068,
    sport_id: 1,
    country_id: 38,
    nationality_id: 38,
    city_id: 93391,
    position_id: 26,
    detailed_position_id: 153,
    type_id: 26,
    name: 'Quinten Maduro',
    display_name: 'Quinten Timber',
    image_path: 'https://cdn.sportmonks.com/images/soccer/players/20/6306068.png',
    height: 177,
    weight: null,
    date_of_birth: '2001-06-17',
    gender: 'male'
  }
}
