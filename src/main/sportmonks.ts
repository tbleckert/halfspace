import type {
  TeamRivalsRefresh,
  FixtureCommentaryRefresh,
  RefreshSeasonScheduleInput,
  SeasonScheduleRefresh,
  RefereeRefresh,
  RefreshRefereeInput,
  CoachRefresh,
  CompetitionRefresh,
  CompetitionSeasonsRefresh,
  EntitySearchInput,
  EntitySearchRefresh,
  FixtureDetailRefresh,
  FixtureOddsRefresh,
  FixtureRefresh,
  PlayerAppearancesRefresh,
  PlayerRefresh,
  PlayerStatisticsRefresh,
  TransfersRefresh,
  RefreshCompetitionFixturesInput,
  RefreshCompetitionSeasonsInput,
  RefreshFixtureHeadToHeadInput,
  RefreshFixtureInput,
  RefreshFixtureOddsInput,
  RefreshFixturesInput,
  RefreshFixtureWindowInput,
  RefreshPlayerAppearancesInput,
  RefreshCoachInput,
  RefreshPlayerInput,
  RefreshPlayerStatisticsInput,
  RefreshPlayerTransfersInput,
  RefreshSeasonStatisticsInput,
  RefreshSeasonTopscorersInput,
  RefreshStandingsInput,
  RefreshTeamFixturesInput,
  RefreshTeamInput,
  RefreshTeamSquadInput,
  RefreshTeamStatisticsInput,
  RefreshTeamTransfersInput,
  RefreshVenueInput,
  SeasonStatisticsRefresh,
  SeasonTopscorersRefresh,
  SportmonksTopscorer,
  StandingsRefresh,
  SportmonksCompetition,
  SportmonksReferee,
  SportmonksCoach,
  SportmonksFixture,
  SportmonksOdd,
  SportmonksPlayer,
  SportmonksPlayerStatistic,
  SportmonksTransfer,
  SportmonksSeason,
  SportmonksSeasonStatistic,
  SportmonksSquadEntry,
  SportmonksStanding,
  SportmonksTeam,
  SportmonksTeamStatistic,
  SportmonksVenue,
  TeamRefresh,
  TeamSquadRefresh,
  TeamStatisticsRefresh,
  VenueRefresh
} from '@shared/contracts'
import { z } from 'zod'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const apiBaseUrl = 'https://api.sportmonks.com/v3/football'
const maximumPages = 100
const seasonStatisticTypeIds = [188, 189, 190, 191, 192, 193, 194]
const teamStatisticTypeIds = [34, 45, 52, 83, 84, 88, 188, 191, 194, 214, 215, 216, 1677, 27263]
const playerStatisticTypeIds = [
  42, 52, 56, 57, 78, 79, 80, 83, 84, 85, 86, 88, 100, 101, 106, 116, 117, 118, 119, 194, 321, 322,
  5304
]

const countrySchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    iso2: z.string().nullable().optional(),
    image_path: z.string().nullable().optional()
  })
  .passthrough()

const seasonSchema = z
  .object({
    id: z.number().int(),
    league_id: z.number().int(),
    name: z.string(),
    is_current: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    starting_at: z.string().nullable().optional(),
    ending_at: z.string().nullable().optional()
  })
  .passthrough()

const competitionSchema = z
  .object({
    id: z.number().int(),
    country_id: z.number().int(),
    name: z.string(),
    active: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    short_code: z.string().nullable().optional(),
    image_path: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    sub_type: z.string().nullable().optional(),
    country: countrySchema.nullable().optional(),
    currentseason: seasonSchema.nullable().optional(),
    currentSeason: seasonSchema.nullable().optional()
  })
  .passthrough()
  .transform(({ currentSeason, ...competition }) => ({
    ...competition,
    currentseason: competition.currentseason ?? currentSeason
  }))

const participantSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    short_code: z.string().nullable().optional(),
    image_path: z.string().nullable().optional(),
    meta: z
      .object({
        location: z.enum(['home', 'away']).optional(),
        winner: z.boolean().nullable().optional(),
        position: z.number().nullable().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough()

const venueSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    country_id: z.number().int().optional(),
    city_id: z.number().int().nullable().optional(),
    address: z.string().nullable().optional(),
    zipcode: z.string().nullable().optional(),
    latitude: z.string().nullable().optional(),
    longitude: z.string().nullable().optional(),
    capacity: z.number().int().nullable().optional(),
    city_name: z.string().nullable().optional(),
    image_path: z.string().nullable().optional(),
    surface: z.string().nullable().optional(),
    national_team: z
      .union([z.boolean(), z.literal(0), z.literal(1)])
      .transform(Boolean)
      .optional(),
    country: countrySchema.nullable().optional()
  })
  .passthrough()

const coachBaseSchema = z
  .object({
    id: z.number().int(),
    player_id: z.number().int().nullable(),
    sport_id: z.number().int(),
    country_id: z.number().int().nullable(),
    nationality_id: z.number().int().nullable(),
    city_id: z.number().int().nullable(),
    common_name: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    name: z.string(),
    display_name: z.string(),
    image_path: z.string().nullable().optional(),
    height: z.number().int().nullable(),
    weight: z.number().int().nullable(),
    date_of_birth: z.string().nullable(),
    gender: z.string().nullable(),
    country: countrySchema.nullable().optional(),
    nationality: countrySchema.nullable().optional(),
    meta: z
      .object({
        fixture_id: z.number().int().optional(),
        participant_id: z.number().int().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough()

const coachAssignmentSchema = z
  .object({
    id: z.number().int(),
    team_id: z.number().int(),
    coach_id: z.number().int(),
    position_id: z.number().int().nullable(),
    active: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    start: z.string().nullable(),
    end: z.string().nullable(),
    temporary: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    coach: coachBaseSchema.nullable().optional()
  })
  .passthrough()

export const teamSchema = z
  .object({
    id: z.number().int(),
    sport_id: z.number().int(),
    country_id: z.number().int().nullable(),
    venue_id: z.number().int().nullable(),
    gender: z.string().nullable(),
    name: z.string(),
    short_code: z.string().nullable().optional(),
    image_path: z.string().nullable().optional(),
    founded: z.number().int().nullable(),
    type: z.string().nullable().optional(),
    placeholder: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    last_played_at: z.string().nullable().optional(),
    country: countrySchema.nullable().optional(),
    venue: venueSchema.nullable().optional(),
    coaches: z.array(coachAssignmentSchema).optional()
  })
  .passthrough()

const coachTeamSchema = coachAssignmentSchema.extend({
  team: teamSchema.nullable().optional()
})

const coachSchema = coachBaseSchema.extend({
  teams: z.array(coachTeamSchema).optional()
})

const positionSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    code: z.string().nullable().optional(),
    developer_name: z.string().nullable().optional()
  })
  .passthrough()

export const playerSchema = z
  .object({
    id: z.number().int(),
    sport_id: z.number().int(),
    country_id: z.number().int().nullable(),
    nationality_id: z.number().int().nullable(),
    city_id: z.number().int().nullable(),
    position_id: z.number().int().nullable(),
    detailed_position_id: z.number().int().nullable(),
    type_id: z.number().int().nullable(),
    common_name: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    name: z.string(),
    display_name: z.string(),
    image_path: z.string().nullable().optional(),
    height: z.number().int().nullable(),
    weight: z.number().int().nullable(),
    date_of_birth: z.string().nullable(),
    gender: z.string().nullable(),
    country: countrySchema.nullable().optional(),
    nationality: countrySchema.nullable().optional(),
    position: positionSchema.nullable().optional(),
    detailedPosition: positionSchema.nullable().optional()
  })
  .passthrough()

const squadEntrySchema = z
  .object({
    id: z.number().int(),
    transfer_id: z.number().int().nullable(),
    player_id: z.number().int(),
    team_id: z.number().int(),
    position_id: z.number().int().nullable(),
    detailed_position_id: z.number().int().nullable(),
    jersey_number: z.number().int().nullable(),
    start: z.string().nullable(),
    end: z.string().nullable(),
    player: playerSchema.nullable().optional(),
    position: positionSchema.nullable().optional(),
    detailedPosition: positionSchema.nullable().optional()
  })
  .passthrough()

const seasonSquadEntrySchema = squadEntrySchema.extend({
  season_id: z.number().int(),
  transfer_id: z.number().int().nullable().default(null),
  detailed_position_id: z.number().int().nullable().default(null),
  start: z.string().nullable().default(null),
  end: z.string().nullable().default(null)
})

const lineupDetailSchema = z
  .object({
    id: z.number().int(),
    fixture_id: z.number().int(),
    player_id: z.number().int(),
    team_id: z.number().int(),
    lineup_id: z.number().int(),
    type_id: z.number().int(),
    data: z.object({ value: z.union([z.number(), z.string()]).nullable().optional() }).passthrough()
  })
  .passthrough()

const typeSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    code: z.string().nullable().optional(),
    developer_name: z.string().nullable().optional(),
    stat_group: z.string().nullable().optional()
  })
  .passthrough()

const transferSchema = z
  .object({
    id: z.number().int(),
    sport_id: z.number().int(),
    player_id: z.number().int(),
    type_id: z.number().int(),
    from_team_id: z.number().int().nullable(),
    to_team_id: z.number().int().nullable(),
    position_id: z.number().int().nullable(),
    detailed_position_id: z.number().int().nullable(),
    date: z.string(),
    career_ended: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    completed: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    amount: z.union([z.number(), z.string()]).nullable().optional().default(null),
    completed_at: z.string().nullable().optional(),
    type: typeSchema.nullable().optional(),
    player: playerSchema.nullable().optional(),
    fromTeam: teamSchema.nullable().optional(),
    toTeam: teamSchema.nullable().optional(),
    fromteam: teamSchema.nullable().optional(),
    toteam: teamSchema.nullable().optional()
  })
  .passthrough()
  .transform(({ fromteam, toteam, ...transfer }) => ({
    ...transfer,
    fromTeam: transfer.fromTeam ?? fromteam,
    toTeam: transfer.toTeam ?? toteam
  }))

const lineupSchema = z
  .object({
    id: z.number().int(),
    fixture_id: z.number().int(),
    player_id: z.number().int(),
    team_id: z.number().int(),
    position_id: z.number().int().nullable(),
    detailed_position_id: z.number().int().nullable().optional(),
    type_id: z.number().int(),
    formation_field: z.string().nullable().optional(),
    formation_position: z.number().int().nullable().optional(),
    player_name: z.string(),
    jersey_number: z.number().int().nullable(),
    player: playerSchema.nullable().optional(),
    details: z.array(lineupDetailSchema).optional()
  })
  .passthrough()

const eventPlayerSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    display_name: z.string().nullable().optional(),
    image_path: z.string().nullable().optional()
  })
  .passthrough()

const eventSchema = z
  .object({
    id: z.number().int(),
    fixture_id: z.number().int(),
    period_id: z.number().int(),
    participant_id: z.number().int(),
    type_id: z.number().int(),
    player_id: z.number().int().nullable().optional(),
    related_player_id: z.number().int().nullable().optional(),
    player_name: z.string().nullable().optional(),
    related_player_name: z.string().nullable().optional(),
    result: z.string().nullable().optional(),
    info: z.string().nullable().optional(),
    addition: z.string().nullable().optional(),
    minute: z.number().int(),
    extra_minute: z.number().int().nullable().optional(),
    sort_order: z.number().int().nullable().optional(),
    injured: z.boolean().nullable().optional(),
    rescinded: z.boolean().nullable().optional(),
    type: typeSchema.nullable().optional(),
    player: eventPlayerSchema.nullable().optional(),
    relatedPlayer: eventPlayerSchema.nullable().optional()
  })
  .passthrough()

const fixtureStatisticSchema = z
  .object({
    id: z.number().int(),
    fixture_id: z.number().int(),
    type_id: z.number().int(),
    participant_id: z.number().int(),
    data: z
      .object({ value: z.union([z.number(), z.string()]).nullable().optional() })
      .passthrough(),
    location: z.enum(['home', 'away']),
    type: typeSchema.nullable().optional()
  })
  .passthrough()

const bookmakerSchema = z.object({ id: z.number().int(), name: z.string() }).passthrough()

const marketSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    developer_name: z.string().nullable().optional()
  })
  .passthrough()

const oddSchema = z
  .object({
    id: z.number().int(),
    fixture_id: z.number().int(),
    market_id: z.number().int(),
    bookmaker_id: z.number().int(),
    label: z.string(),
    value: z.string(),
    name: z.string().nullable().optional(),
    market_description: z.string().nullable().optional(),
    probability: z.string().nullable().optional(),
    winning: z.boolean().nullable().optional(),
    stopped: z.boolean().nullable().optional(),
    suspended: z.boolean().nullable().optional(),
    participants: z.string().nullable().optional(),
    latest_bookmaker_update: z.string().nullable().optional(),
    total: z.string().nullable().optional(),
    handicap: z.string().nullable().optional(),
    bookmaker: bookmakerSchema.nullable().optional(),
    market: marketSchema.nullable().optional()
  })
  .passthrough()

const periodSchema = z
  .object({
    id: z.number().int(),
    fixture_id: z.number().int(),
    type_id: z.number().int(),
    started: z.number().int(),
    ended: z.number().int().nullable(),
    counts_from: z.number().int(),
    ticking: z.boolean(),
    sort_order: z.number().int(),
    description: z.string(),
    time_added: z.number().int().nullable(),
    period_length: z.number().int(),
    minutes: z.number().int(),
    seconds: z.number().int(),
    has_timer: z.boolean()
  })
  .passthrough()

const fixtureContextSchema = z
  .object({
    id: z.number().int(),
    name: z.string()
  })
  .passthrough()

const refereeBaseSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    display_name: z.string(),
    country_id: z.number().int().nullable(),
    image_path: z.string().nullable().optional(),
    date_of_birth: z.string().nullable().optional(),
    country: countrySchema.nullable().optional()
  })
  .passthrough()

const refereeAssignmentSchema = z
  .object({
    id: z.number().int(),
    fixture_id: z.number().int(),
    referee_id: z.number().int(),
    type_id: z.number().int(),
    referee: refereeBaseSchema.nullable().optional(),
    type: positionSchema.nullable().optional()
  })
  .passthrough()

const fixtureSchema = z
  .object({
    id: z.number().int(),
    league_id: z.number().int(),
    season_id: z.number().int(),
    state_id: z.number().int(),
    stage_id: z.number().int().nullable().optional(),
    round_id: z.number().int().nullable().optional(),
    venue_id: z.number().int().nullable().optional(),
    name: z.string().nullable().optional(),
    starting_at: z.string().nullable().optional(),
    starting_at_timestamp: z.number().nullable().optional(),
    result_info: z.string().nullable().optional(),
    placeholder: z.boolean(),
    has_odds: z.boolean(),
    participants: z.array(participantSchema).optional().default([]),
    league: z
      .object({
        id: z.number().int(),
        name: z.string(),
        short_code: z.string().nullable().optional()
      })
      .passthrough()
      .nullable()
      .optional(),
    state: z
      .object({
        id: z.number().int(),
        name: z.string(),
        short_name: z.string().optional(),
        developer_name: z.string().optional()
      })
      .passthrough()
      .nullable()
      .optional(),
    stage: fixtureContextSchema.nullable().optional(),
    round: fixtureContextSchema.nullable().optional(),
    venue: venueSchema.nullable().optional(),
    scores: z
      .array(
        z
          .object({
            id: z.number().int(),
            participant_id: z.number().int(),
            description: z.string().optional(),
            score: z.object({
              goals: z.number(),
              participant: z.enum(['home', 'away'])
            })
          })
          .passthrough()
      )
      .optional()
      .default([]),
    periods: z.array(periodSchema).optional(),
    lineups: z.array(lineupSchema).optional(),
    events: z.array(eventSchema).optional(),
    statistics: z.array(fixtureStatisticSchema).optional(),
    coaches: z.array(coachBaseSchema).optional(),
    referees: z.array(refereeAssignmentSchema).optional()
  })
  .passthrough()

const fixtureDetailResponseSchema = z
  .object({
    data: fixtureSchema,
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const fixtureResponseSchema = z
  .object({
    data: z.array(fixtureSchema),
    pagination: z
      .object({
        current_page: z.number().int().positive(),
        has_more: z.boolean()
      })
      .optional(),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    timezone: z.string().optional(),
    message: z.string().optional()
  })
  .passthrough()

const fixtureOddsResponseSchema = z
  .object({
    data: z.array(oddSchema),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const standingContextSchema = z
  .object({
    id: z.number().int(),
    name: z.string()
  })
  .passthrough()

const standingSchema = z
  .object({
    id: z.number().int(),
    participant_id: z.number().int(),
    league_id: z.number().int(),
    season_id: z.number().int(),
    stage_id: z.number().int(),
    group_id: z.number().int().nullable(),
    round_id: z.number().int().nullable(),
    standing_rule_id: z.number().int().nullable(),
    position: z.number().int(),
    result: z.string().nullable(),
    points: z.number(),
    participant: participantSchema.nullable().optional(),
    stage: standingContextSchema.nullable().optional(),
    group: standingContextSchema.nullable().optional(),
    details: z
      .array(
        z
          .object({ id: z.number().int(), type_id: z.number().int(), value: z.number() })
          .passthrough()
      )
      .optional(),
    form: z
      .array(
        z
          .object({
            id: z.number().int(),
            fixture_id: z.number().int(),
            form: z.string(),
            sort_order: z.number().int()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough()

const standingsResponseSchema = z
  .object({
    data: z.array(standingSchema),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const seasonStatisticSchema = z
  .object({
    id: z.number().int(),
    model_id: z.number().int(),
    type_id: z.number().int(),
    relation_id: z.number().int().nullable().optional(),
    value: z.unknown()
  })
  .passthrough()

const seasonTopscorersResponseSchema = z.object({
  data: z.array(
    z
      .object({
        id: z.number().int(),
        season_id: z.number().int(),
        player_id: z.number().int(),
        participant_id: z.number().int().nullable(),
        type_id: z.number().int(),
        position: z.number().int().positive(),
        total: z.number().int().nonnegative(),
        player: playerSchema.nullable().optional(),
        participant: teamSchema.nullable().optional(),
        type: typeSchema.nullable().optional()
      })
      .passthrough()
  ),
  pagination: z
    .object({
      current_page: z.number().int().positive(),
      has_more: z.boolean()
    })
    .optional(),
  rate_limit: z
    .object({
      remaining: z.number(),
      resets_in_seconds: z.number()
    })
    .optional(),
  message: z.string().optional()
})

const seasonStatisticsResponseSchema = z
  .object({
    data: z
      .object({
        id: z.number().int(),
        statistics: z.array(seasonStatisticSchema).optional().default([])
      })
      .passthrough(),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const teamStatisticDetailSchema = z
  .object({
    id: z.number().int(),
    team_statistic_id: z.number().int(),
    type_id: z.number().int(),
    value: z.unknown()
  })
  .passthrough()

const teamStatisticsResponseSchema = z
  .object({
    data: z
      .object({
        id: z.number().int(),
        statistics: z
          .array(
            z
              .object({
                id: z.number().int(),
                team_id: z.number().int(),
                season_id: z.number().int(),
                has_values: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
                details: z.array(teamStatisticDetailSchema).optional().default([])
              })
              .passthrough()
          )
          .optional()
          .default([])
      })
      .passthrough(),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const playerStatisticDetailSchema = z
  .object({
    id: z.number().int(),
    player_statistic_id: z.number().int(),
    type_id: z.number().int(),
    value: z.unknown()
  })
  .passthrough()

const playerStatisticsResponseSchema = z
  .object({
    data: z
      .object({
        id: z.number().int(),
        statistics: z
          .array(
            z
              .object({
                id: z.number().int(),
                player_id: z.number().int(),
                team_id: z.number().int(),
                season_id: z.number().int(),
                has_values: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
                position_id: z.number().int().nullable().optional().default(null),
                jersey_number: z.number().int().nullable().optional().default(null),
                details: z.array(playerStatisticDetailSchema).optional().default([])
              })
              .passthrough()
          )
          .optional()
          .default([])
      })
      .passthrough(),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const competitionResponseSchema = z
  .object({
    data: z.array(competitionSchema),
    pagination: z.object({
      current_page: z.number().int().positive(),
      has_more: z.boolean()
    }),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const seasonsResponseSchema = z
  .object({
    data: z.array(seasonSchema),
    pagination: z.object({
      current_page: z.number().int().positive(),
      has_more: z.boolean()
    }),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const teamResponseSchema = z
  .object({
    data: teamSchema.extend({
      sidelined: z
        .array(
          z
            .object({
              id: z.number().int(),
              player_id: z.number().int(),
              team_id: z.number().int(),
              season_id: z.number().int().nullable(),
              type_id: z.number().int(),
              category: z.string(),
              start_date: z.string(),
              end_date: z.string().nullable(),
              games_missed: z.number().int(),
              completed: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
              type: positionSchema.nullable().optional(),
              player: playerSchema.nullable().optional()
            })
            .passthrough()
        )
        .optional()
    }),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const venueResponseSchema = z
  .object({
    data: venueSchema,
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const teamSquadResponseSchema = z
  .object({
    data: z.array(squadEntrySchema),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const playerResponseSchema = z
  .object({
    data: playerSchema,
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const coachResponseSchema = z
  .object({
    data: coachSchema,
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const playerTransfersResponseSchema = z
  .object({
    data: z.array(transferSchema),
    pagination: z
      .object({
        current_page: z.number().int().positive(),
        has_more: z.boolean()
      })
      .optional(),
    rate_limit: z
      .object({
        remaining: z.number(),
        resets_in_seconds: z.number()
      })
      .passthrough()
      .optional(),
    message: z.string().optional()
  })
  .passthrough()

const competitionSearchResponseSchema = z.object({ data: z.array(competitionSchema) }).passthrough()
const teamSearchResponseSchema = z.object({ data: z.array(teamSchema) }).passthrough()
const playerSearchResponseSchema = z.object({ data: z.array(playerSchema) }).passthrough()
const coachSearchResponseSchema = z.object({ data: z.array(coachSchema) }).passthrough()
const venueSearchResponseSchema = z.object({ data: z.array(venueSchema) }).passthrough()
const refereeSearchResponseSchema = z.object({ data: z.array(refereeBaseSchema) }).passthrough()
const fixtureSearchResponseSchema = z.object({ data: z.array(fixtureSchema) }).passthrough()

export function validateToken(value: unknown): string {
  if (typeof value !== 'string') {
    throw new SportmonksError('invalid_input', 'Enter a Sportmonks token.')
  }

  if (value.length === 0 || value.length > 512 || value.trim() !== value || /\s/.test(value)) {
    throw new SportmonksError('invalid_input', 'Enter a valid Sportmonks token.')
  }

  return value
}

export function validateRefreshInput(value: unknown): RefreshFixturesInput {
  if (!value || typeof value !== 'object') {
    throw new SportmonksError('invalid_input', 'Choose a valid date.')
  }

  const input = value as Record<string, unknown>

  if (typeof input.date !== 'string' || !isValidIsoDate(input.date)) {
    throw new SportmonksError('invalid_input', 'Choose a valid date.')
  }

  if (typeof input.timeZone !== 'string' || !isValidTimeZone(input.timeZone)) {
    throw new SportmonksError('invalid_input', 'The selected time zone is not valid.')
  }

  return { date: input.date, timeZone: input.timeZone }
}

export function validateFixtureWindowInput(value: unknown): RefreshFixtureWindowInput {
  return validateDateRange(value)
}

export function validateFixtureInput(value: unknown): RefreshFixtureInput {
  const fixtureId =
    value && typeof value === 'object' ? (value as { fixtureId?: unknown }).fixtureId : 0

  if (!isPositiveId(fixtureId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid fixture.')
  }

  return { fixtureId }
}

export function validateFixtureOddsInput(value: unknown): RefreshFixtureOddsInput {
  const { fixtureId } = validateFixtureInput(value)
  const feed = (value as { feed?: unknown }).feed
  if (feed !== 'pre-match' && feed !== 'inplay') {
    throw new SportmonksError('invalid_input', 'Select a valid odds feed.')
  }
  return { fixtureId, feed }
}

export function validateFixtureHeadToHeadInput(value: unknown): RefreshFixtureHeadToHeadInput {
  if (!value || typeof value !== 'object') {
    throw new SportmonksError('invalid_input', 'Choose two valid teams.')
  }

  const input = value as Record<string, unknown>
  if (!isPositiveId(input.firstTeamId) || !isPositiveId(input.secondTeamId)) {
    throw new SportmonksError('invalid_input', 'Choose two valid teams.')
  }

  if (input.firstTeamId === input.secondTeamId) {
    throw new SportmonksError('invalid_input', 'Choose two different teams.')
  }

  if (typeof input.timeZone !== 'string' || !isValidTimeZone(input.timeZone)) {
    throw new SportmonksError('invalid_input', 'The selected time zone is not valid.')
  }

  return {
    firstTeamId: input.firstTeamId,
    secondTeamId: input.secondTeamId,
    timeZone: input.timeZone
  }
}

export function validateStandingsInput(value: unknown): RefreshStandingsInput {
  const seasonId =
    value && typeof value === 'object' ? (value as { seasonId?: unknown }).seasonId : 0

  if (!isPositiveId(seasonId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid current season.')
  }

  return { seasonId }
}

export function validateSeasonStatisticsInput(value: unknown): RefreshSeasonStatisticsInput {
  const seasonId =
    value && typeof value === 'object' ? (value as { seasonId?: unknown }).seasonId : 0

  if (!isPositiveId(seasonId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid season.')
  }

  return { seasonId }
}

export function validateSeasonTopscorersInput(value: unknown): RefreshSeasonTopscorersInput {
  return validateSeasonStatisticsInput(value)
}

export function validateCompetitionSeasonsInput(value: unknown): RefreshCompetitionSeasonsInput {
  const competitionId =
    value && typeof value === 'object' ? (value as { competitionId?: unknown }).competitionId : 0

  if (!isPositiveId(competitionId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid competition.')
  }

  return { competitionId }
}

export function validateTeamInput(value: unknown): RefreshTeamInput {
  const teamId = value && typeof value === 'object' ? (value as { teamId?: unknown }).teamId : 0

  if (!isPositiveId(teamId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid team.')
  }

  return { teamId }
}

export function validateTeamStatisticsInput(value: unknown): RefreshTeamStatisticsInput {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  if (!isPositiveId(input.teamId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid team.')
  }

  if (!isPositiveId(input.seasonId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid season.')
  }

  return { seasonId: input.seasonId, teamId: input.teamId }
}

export function validateTeamSquadInput(value: unknown): RefreshTeamSquadInput {
  const { teamId } = validateTeamInput(value)
  const seasonId = (value as { seasonId?: unknown }).seasonId
  if (seasonId !== undefined && !isPositiveId(seasonId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid season.')
  }
  return { teamId, seasonId }
}

export function validateVenueInput(value: unknown): RefreshVenueInput {
  const venueId = value && typeof value === 'object' ? (value as { venueId?: unknown }).venueId : 0

  if (!isPositiveId(venueId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid venue.')
  }

  return { venueId }
}

export function validatePlayerInput(value: unknown): RefreshPlayerInput {
  const playerId =
    value && typeof value === 'object' ? (value as { playerId?: unknown }).playerId : 0

  if (!isPositiveId(playerId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid player.')
  }

  return { playerId }
}

export function validateCoachInput(value: unknown): RefreshCoachInput {
  const coachId = value && typeof value === 'object' ? (value as { coachId?: unknown }).coachId : 0

  if (!isPositiveId(coachId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid coach.')
  }

  return { coachId }
}

export function validatePlayerStatisticsInput(value: unknown): RefreshPlayerStatisticsInput {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  if (!isPositiveId(input.playerId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid player.')
  }

  if (!isPositiveId(input.seasonId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid season.')
  }

  return { playerId: input.playerId, seasonId: input.seasonId }
}

export function validatePlayerTransfersInput(value: unknown): RefreshPlayerTransfersInput {
  return validatePlayerInput(value)
}

export function validateTeamTransfersInput(value: unknown): RefreshTeamTransfersInput {
  return validateTeamInput(value)
}

export function validateEntitySearchInput(value: unknown): EntitySearchInput {
  const query =
    value && typeof value === 'object' ? (value as { query?: unknown }).query : undefined

  if (typeof query !== 'string' || query.trim().length < 2) {
    throw new SportmonksError('invalid_input', 'Enter at least two characters.')
  }

  const trimmedQuery = query.trim()
  if (trimmedQuery.length > 80) {
    throw new SportmonksError('invalid_input', 'Search terms cannot exceed 80 characters.')
  }

  return { query: trimmedQuery }
}

export function validatePlayerAppearancesInput(value: unknown): RefreshPlayerAppearancesInput {
  const input = validateFixtureRange(value, 'teamId')
  const playerId =
    value && typeof value === 'object' ? (value as { playerId?: unknown }).playerId : 0

  if (!isPositiveId(playerId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid player.')
  }

  return {
    playerId,
    teamId: input.entityId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone
  }
}

export function validateCompetitionFixturesInput(value: unknown): RefreshCompetitionFixturesInput {
  const input = validateFixtureRange(value, 'competitionId')

  return {
    competitionId: input.entityId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone
  }
}

export function validateTeamFixturesInput(value: unknown): RefreshTeamFixturesInput {
  const input = validateFixtureRange(value, 'teamId')

  return {
    teamId: input.entityId,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone
  }
}

export async function fetchFixturesByDate(
  input: RefreshFixturesInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureRefresh> {
  return fetchFixturePages(`fixtures/date/${input.date}`, input.timeZone, token, fetcher)
}

export async function fetchFixturesByDateRange(
  input: RefreshFixtureWindowInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureRefresh> {
  return fetchFixturePages(
    `fixtures/between/${input.startDate}/${input.endDate}`,
    input.timeZone,
    token,
    fetcher
  )
}

export async function fetchFixtureById(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureDetailRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/fixtures/${input.fixtureId}`)
  url.searchParams.set(
    'include',
    'participants;league;state;scores;periods;venue;stage;round;coaches;referees.referee;referees.type;lineups.player;lineups.details;events.type;events.player;events.relatedPlayer;statistics.type'
  )
  url.searchParams.set('filters', 'lineupDetailTypes:42,57,78,80,86,100,106,116,117,118,119')

  const parsed = await requestSportmonks(url, token, fixtureDetailResponseSchema, fetcher)

  return {
    fixture: parsed.data as SportmonksFixture,
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchFixtureHeadToHead(
  input: RefreshFixtureHeadToHeadInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureRefresh> {
  return fetchFixturePages(
    `fixtures/head-to-head/${input.firstTeamId}/${input.secondTeamId}`,
    input.timeZone,
    token,
    fetcher,
    undefined,
    'participants;league;state;scores;periods',
    { order: 'desc', pageLimit: 1, perPage: 10 }
  )
}

export async function fetchFixtureCommentary(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureCommentaryRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/commentaries/fixtures/${input.fixtureId}`)
  url.searchParams.set('include', 'player;relatedPlayer')
  const schema = fixtureDetailResponseSchema.extend({
    data: z.array(
      z.object({
        id: z.number().int(),
        fixture_id: z.number().int(),
        comment: z.string(),
        minute: z.number().nullable(),
        extra_minute: z.number().nullable(),
        order: z.number(),
        is_goal: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
        is_important: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
        player: playerSchema.nullable().optional(),
        relatedPlayer: playerSchema.nullable().optional()
      })
    )
  })
  const parsed = await requestSportmonks(url, token, schema, fetcher)
  return {
    commentaries: parsed.data,
    fetchedAt,
    message: parsed.message,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined
  }
}

export async function fetchFixtureOdds(
  input: RefreshFixtureOddsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureOddsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/odds/${input.feed}/fixtures/${input.fixtureId}`)
  url.searchParams.set('include', 'bookmaker;market')

  const parsed = await requestSportmonks(url, token, fixtureOddsResponseSchema, fetcher)
  if (parsed.data.some((odd) => odd.fixture_id !== input.fixtureId)) {
    throw new SportmonksError('invalid_response', 'Sportmonks returned odds for another fixture.')
  }

  return {
    odds: parsed.data as SportmonksOdd[],
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchCompetitionFixtures(
  input: RefreshCompetitionFixturesInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureRefresh> {
  return fetchFixturePages(
    `fixtures/between/${input.startDate}/${input.endDate}`,
    input.timeZone,
    token,
    fetcher,
    `fixtureLeagues:${input.competitionId}`
  )
}

export async function fetchTeamFixtures(
  input: RefreshTeamFixturesInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureRefresh> {
  return fetchFixturePages(
    `fixtures/between/${input.startDate}/${input.endDate}/${input.teamId}`,
    input.timeZone,
    token,
    fetcher
  )
}

export async function fetchPlayerAppearances(
  input: RefreshPlayerAppearancesInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<PlayerAppearancesRefresh> {
  const refresh = await fetchFixturePages(
    `fixtures/between/${input.startDate}/${input.endDate}/${input.teamId}`,
    input.timeZone,
    token,
    fetcher,
    undefined,
    'participants;league;state;scores;periods;lineups'
  )
  const appearances = refresh.fixtures.flatMap((fixture) => {
    const lineup = fixture.lineups?.find(
      (entry) => entry.player_id === input.playerId && entry.team_id === input.teamId
    )
    if (!lineup) return []

    return [{ fixture: { ...fixture, lineups: undefined }, lineup }]
  })
  return {
    appearances,
    fetchedAt: refresh.fetchedAt,
    pageCount: refresh.pageCount,
    timeZone: refresh.timeZone,
    rateLimit: refresh.rateLimit,
    message: refresh.message
  }
}

export async function fetchPlayerStatistics(
  input: RefreshPlayerStatisticsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<PlayerStatisticsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/players/${input.playerId}`)
  url.searchParams.set('include', 'statistics.details')
  url.searchParams.set(
    'filters',
    `playerStatisticSeasons:${input.seasonId};playerStatisticDetailTypes:${playerStatisticTypeIds.join(',')}`
  )

  const parsed = await requestSportmonks(url, token, playerStatisticsResponseSchema, fetcher)

  return {
    statistics: parsed.data.statistics as SportmonksPlayerStatistic[],
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchPlayerTransfers(
  input: RefreshPlayerTransfersInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TransfersRefresh> {
  return fetchTransfers(
    `/transfers/players/${input.playerId}`,
    'type;fromTeam;toTeam',
    token,
    fetcher
  )
}

export async function fetchTeamTransfers(
  input: RefreshTeamTransfersInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TransfersRefresh> {
  return fetchTransfers(
    `/transfers/teams/${input.teamId}`,
    'player;type;fromTeam;toTeam',
    token,
    fetcher
  )
}

async function fetchTransfers(
  path: string,
  includes: string,
  token: string,
  fetcher: typeof fetch
): Promise<TransfersRefresh> {
  const fetchedAt = Date.now()
  const transfers: SportmonksTransfer[] = []
  let page = 1
  let rateLimit: TransfersRefresh['rateLimit']
  let message: string | undefined

  while (page <= maximumPages) {
    const url = new URL(`${apiBaseUrl}${path}`)
    url.searchParams.set('include', includes)
    url.searchParams.set('order', 'desc')
    url.searchParams.set('per_page', '50')
    url.searchParams.set('page', String(page))

    const parsed = await requestSportmonks(url, token, playerTransfersResponseSchema, fetcher)

    transfers.push(...(parsed.data as SportmonksTransfer[]))
    message = parsed.message ?? message

    if (parsed.rate_limit) {
      rateLimit = {
        remaining: parsed.rate_limit.remaining,
        resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
      }
    }

    if (!parsed.pagination?.has_more) {
      return { transfers, fetchedAt, pageCount: page, rateLimit, message }
    }

    page += 1
  }

  throw new SportmonksError('invalid_response', 'Sportmonks returned too many result pages.')
}

async function fetchFixturePages(
  path: string,
  timeZone: string,
  token: string,
  fetcher: typeof fetch,
  filters?: string,
  includes = 'participants;league;state;scores;periods',
  options: { order?: 'asc' | 'desc'; pageLimit?: number; perPage?: number } = {}
): Promise<FixtureRefresh> {
  const fixtures: SportmonksFixture[] = []
  const fetchedAt = Date.now()
  let page = 1
  let rateLimit: FixtureRefresh['rateLimit']
  let message: string | undefined

  const pageLimit = options.pageLimit ?? maximumPages

  while (page <= pageLimit) {
    const url = new URL(`${apiBaseUrl}/${path}`)
    url.searchParams.set('include', includes)
    url.searchParams.set('timezone', timeZone)
    url.searchParams.set('order', options.order ?? 'asc')
    url.searchParams.set('per_page', String(options.perPage ?? 50))
    url.searchParams.set('page', String(page))
    if (filters) url.searchParams.set('filters', filters)

    const parsed = await requestSportmonks(url, token, fixtureResponseSchema, fetcher)

    fixtures.push(...(parsed.data as SportmonksFixture[]))
    message = parsed.message ?? message

    if (parsed.rate_limit) {
      rateLimit = {
        remaining: parsed.rate_limit.remaining,
        resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
      }
    }

    if (!parsed.pagination?.has_more || page === options.pageLimit) {
      return {
        fixtures,
        fetchedAt,
        pageCount: page,
        timeZone: parsed.timezone ?? timeZone,
        rateLimit,
        message
      }
    }

    page += 1
  }

  throw new SportmonksError('invalid_response', 'Sportmonks returned too many result pages.')
}

export async function fetchCompetitions(
  token: string,
  fetcher: typeof fetch = fetch
): Promise<CompetitionRefresh> {
  const competitions: SportmonksCompetition[] = []
  const fetchedAt = Date.now()
  let page = 1
  let rateLimit: CompetitionRefresh['rateLimit']
  let message: string | undefined

  while (page <= maximumPages) {
    const url = new URL(`${apiBaseUrl}/leagues`)
    url.searchParams.set('include', 'country;currentSeason')
    url.searchParams.set('per_page', '50')
    url.searchParams.set('page', String(page))

    const parsed = await requestSportmonks(url, token, competitionResponseSchema, fetcher)

    competitions.push(...(parsed.data as SportmonksCompetition[]))
    message = parsed.message ?? message

    if (parsed.rate_limit) {
      rateLimit = {
        remaining: parsed.rate_limit.remaining,
        resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
      }
    }

    if (!parsed.pagination.has_more) {
      return {
        competitions,
        fetchedAt,
        pageCount: page,
        rateLimit,
        message
      }
    }

    page += 1
  }

  throw new SportmonksError('invalid_response', 'Sportmonks returned too many result pages.')
}

export async function fetchStandingsBySeason(
  input: RefreshStandingsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<StandingsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/standings/seasons/${input.seasonId}`)
  url.searchParams.set('include', 'participant;stage;group;details;form')
  url.searchParams.set('filters', 'standingDetailTypes:129,179')

  const parsed = await requestSportmonks(url, token, standingsResponseSchema, fetcher)

  return {
    standings: parsed.data as SportmonksStanding[],
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchSeasonStatistics(
  input: RefreshSeasonStatisticsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<SeasonStatisticsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/seasons/${input.seasonId}`)
  url.searchParams.set('include', 'statistics')
  url.searchParams.set('filters', `seasonStatisticTypes:${seasonStatisticTypeIds.join(',')}`)

  const parsed = await requestSportmonks(url, token, seasonStatisticsResponseSchema, fetcher)

  return {
    statistics: parsed.data.statistics as SportmonksSeasonStatistic[],
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchSeasonTopscorers(
  input: RefreshSeasonTopscorersInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<SeasonTopscorersRefresh> {
  const fetchedAt = Date.now()
  const topscorers: SportmonksTopscorer[] = []
  let rateLimit: SeasonTopscorersRefresh['rateLimit']
  let message: string | undefined

  for (let page = 1; page <= maximumPages; page += 1) {
    const url = new URL(`${apiBaseUrl}/topscorers/seasons/${input.seasonId}`)
    url.searchParams.set('include', 'player;participant;type')
    url.searchParams.set('filters', 'seasonTopscorerTypes:208,209,84,83')
    url.searchParams.set('order', 'asc')
    url.searchParams.set('per_page', '50')
    url.searchParams.set('page', String(page))

    const parsed = await requestSportmonks(url, token, seasonTopscorersResponseSchema, fetcher)

    topscorers.push(...(parsed.data as SportmonksTopscorer[]))
    message = parsed.message ?? message
    if (parsed.rate_limit) {
      rateLimit = {
        remaining: parsed.rate_limit.remaining,
        resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
      }
    }
    if (!parsed.pagination?.has_more) {
      return { topscorers, fetchedAt, pageCount: page, rateLimit, message }
    }
  }

  throw new SportmonksError('invalid_response', 'Sportmonks returned too many result pages.')
}

export async function fetchCompetitionSeasons(
  input: RefreshCompetitionSeasonsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<CompetitionSeasonsRefresh> {
  const seasons: SportmonksSeason[] = []
  const fetchedAt = Date.now()
  let page = 1
  let rateLimit: CompetitionSeasonsRefresh['rateLimit']
  let message: string | undefined

  while (page <= maximumPages) {
    const url = new URL(`${apiBaseUrl}/seasons`)
    url.searchParams.set('filters', `seasonLeagues:${input.competitionId}`)
    url.searchParams.set('order', 'desc')
    url.searchParams.set('per_page', '50')
    url.searchParams.set('page', String(page))

    const parsed = await requestSportmonks(url, token, seasonsResponseSchema, fetcher)

    seasons.push(...(parsed.data as SportmonksSeason[]))
    message = parsed.message ?? message

    if (parsed.rate_limit) {
      rateLimit = {
        remaining: parsed.rate_limit.remaining,
        resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
      }
    }

    if (!parsed.pagination.has_more) {
      return { seasons, fetchedAt, pageCount: page, rateLimit, message }
    }

    page += 1
  }

  throw new SportmonksError('invalid_response', 'Sportmonks returned too many result pages.')
}

export async function fetchTeamRivals(
  input: RefreshTeamInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamRivalsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/rivals/teams/${input.teamId}`)
  url.searchParams.set('include', 'team;rival')
  const schema = fixtureDetailResponseSchema.extend({
    data: z.array(
      z.object({
        team_id: z.number().int(),
        rival_id: z.number().int(),
        team: teamSchema.nullable().optional(),
        rival: teamSchema.nullable().optional()
      })
    )
  })
  const parsed = await requestSportmonks(url, token, schema, fetcher)
  return {
    rivals: parsed.data,
    fetchedAt,
    message: parsed.message,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined
  }
}

export async function fetchTeamById(
  input: RefreshTeamInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/teams/${input.teamId}`)
  url.searchParams.set('include', 'country;venue;coaches.coach;sidelined.player;sidelined.type')

  const parsed = await requestSportmonks(url, token, teamResponseSchema, fetcher)

  return {
    team: parsed.data as SportmonksTeam,
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export function validateSeasonScheduleInput(value: unknown): RefreshSeasonScheduleInput {
  const seasonId =
    value && typeof value === 'object' ? (value as { seasonId?: unknown }).seasonId : undefined
  if (!isPositiveId(seasonId)) throw new SportmonksError('invalid_input', 'Choose a valid season.')
  return { seasonId }
}

export async function fetchSeasonSchedule(
  input: RefreshSeasonScheduleInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<SeasonScheduleRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/schedules/seasons/${input.seasonId}`)
  const round = z.object({
    id: z.number().int(),
    name: z.string(),
    finished: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    is_current: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean),
    starting_at: z.string().nullable().optional(),
    ending_at: z.string().nullable().optional(),
    fixtures: z.array(fixtureSchema).default([])
  })
  const schema = fixtureDetailResponseSchema.extend({
    data: z.array(
      round.extend({
        season_id: z.number().int(),
        sort_order: z.number().int(),
        rounds: z.array(round).default([])
      })
    )
  })
  const parsed = await requestSportmonks(url, token, schema, fetcher)
  return {
    stages: parsed.data,
    fetchedAt,
    message: parsed.message,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined
  }
}

export function validateRefereeInput(value: unknown): RefreshRefereeInput {
  const refereeId =
    value && typeof value === 'object' ? (value as { refereeId?: unknown }).refereeId : undefined
  if (!isPositiveId(refereeId))
    throw new SportmonksError('invalid_input', 'Choose a valid referee.')
  return { refereeId }
}

export async function fetchRefereeById(
  input: RefreshRefereeInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<RefereeRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/referees/${input.refereeId}`)
  url.searchParams.set(
    'include',
    'country;latest.type;latest.fixture.participants;latest.fixture.league;latest.fixture.scores;latest.fixture.state;latest.fixture.periods'
  )

  const schema = fixtureDetailResponseSchema.extend({
    data: refereeBaseSchema.extend({
      latest: z
        .array(refereeAssignmentSchema.extend({ fixture: fixtureSchema.nullable().optional() }))
        .optional()
    })
  })
  const parsed = await requestSportmonks(url, token, schema, fetcher)
  return {
    referee: parsed.data,
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchCoachById(
  input: RefreshCoachInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<CoachRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/coaches/${input.coachId}`)
  url.searchParams.set('include', 'nationality;teams.team')

  const parsed = await requestSportmonks(url, token, coachResponseSchema, fetcher)

  return {
    coach: parsed.data as SportmonksCoach,
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchTeamStatistics(
  input: RefreshTeamStatisticsInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamStatisticsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/teams/${input.teamId}`)
  url.searchParams.set('include', 'statistics.details')
  url.searchParams.set(
    'filters',
    `teamStatisticSeasons:${input.seasonId};teamStatisticDetailTypes:${teamStatisticTypeIds.join(',')}`
  )

  const parsed = await requestSportmonks(url, token, teamStatisticsResponseSchema, fetcher)

  return {
    statistics: parsed.data.statistics.flatMap(
      ({ details }) => details
    ) as SportmonksTeamStatistic[],
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchTeamSquad(
  input: RefreshTeamSquadInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamSquadRefresh> {
  const fetchedAt = Date.now()
  const path = input.seasonId
    ? `/squads/seasons/${input.seasonId}/teams/${input.teamId}`
    : `/squads/teams/${input.teamId}`
  const url = new URL(`${apiBaseUrl}${path}`)
  url.searchParams.set(
    'include',
    input.seasonId ? 'player.nationality;position' : 'player.nationality;position;detailedPosition'
  )

  const schema = input.seasonId
    ? teamSquadResponseSchema.extend({ data: z.array(seasonSquadEntrySchema) })
    : teamSquadResponseSchema
  const parsed = await requestSportmonks(url, token, schema, fetcher)

  return {
    squad: parsed.data as SportmonksSquadEntry[],
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchPlayerById(
  input: RefreshPlayerInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<PlayerRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/players/${input.playerId}`)
  url.searchParams.set('include', 'nationality;position;detailedPosition')

  const parsed = await requestSportmonks(url, token, playerResponseSchema, fetcher)

  return {
    player: parsed.data as SportmonksPlayer,
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchVenueById(
  input: RefreshVenueInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<VenueRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/venues/${input.venueId}`)
  url.searchParams.set('include', 'country')

  const parsed = await requestSportmonks(url, token, venueResponseSchema, fetcher)

  return {
    venue: parsed.data as SportmonksVenue,
    fetchedAt,
    rateLimit: parsed.rate_limit
      ? {
          remaining: parsed.rate_limit.remaining,
          resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
        }
      : undefined,
    message: parsed.message
  }
}

export async function fetchEntitySearch(
  input: EntitySearchInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<EntitySearchRefresh> {
  const fetchedAt = Date.now()
  const query = encodeURIComponent(input.query)
  const [
    competitionResponse,
    teamResponse,
    playerResponse,
    coachResponse,
    venueResponse,
    refereeResponse,
    fixtureResponse
  ] = await Promise.all([
    fetchEntitySearchPage('leagues', query, 'country;currentSeason', token, fetcher),
    fetchEntitySearchPage('teams', query, 'country;venue', token, fetcher),
    fetchEntitySearchPage(
      'players',
      query,
      'nationality;position;detailedPosition',
      token,
      fetcher
    ),
    fetchEntitySearchPage('coaches', query, 'nationality', token, fetcher),
    fetchEntitySearchPage('venues', query, 'country', token, fetcher),
    fetchEntitySearchPage('referees', query, 'country', token, fetcher),
    fetchEntitySearchPage(
      'fixtures',
      query,
      'participants;league;state;scores;periods',
      token,
      fetcher
    )
  ])

  try {
    return {
      competitions: competitionSearchResponseSchema.parse(competitionResponse)
        .data as SportmonksCompetition[],
      teams: teamSearchResponseSchema.parse(teamResponse).data as SportmonksTeam[],
      players: playerSearchResponseSchema.parse(playerResponse).data as SportmonksPlayer[],
      coaches: coachSearchResponseSchema.parse(coachResponse).data as SportmonksCoach[],
      referees: refereeSearchResponseSchema.parse(refereeResponse).data as SportmonksReferee[],
      fixtures: fixtureSearchResponseSchema.parse(fixtureResponse).data as SportmonksFixture[],
      venues: venueSearchResponseSchema.parse(venueResponse).data as SportmonksVenue[],
      fetchedAt
    }
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }
}

async function fetchEntitySearchPage(
  entity: 'leagues' | 'teams' | 'players' | 'coaches' | 'venues' | 'referees' | 'fixtures',
  query: string,
  include: string,
  token: string,
  fetcher: typeof fetch
): Promise<unknown> {
  const url = new URL(`${apiBaseUrl}/${entity}/search/${query}`)
  url.searchParams.set('include', include)
  url.searchParams.set('per_page', '8')
  if (entity === 'fixtures') url.searchParams.set('order', 'desc')

  return requestSportmonks(url, token, z.unknown(), fetcher)
}

function isValidIsoDate(value: string): boolean {
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

function isPositiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function validateFixtureRange(
  value: unknown,
  entityIdKey: 'competitionId' | 'teamId'
): { entityId: number; startDate: string; endDate: string; timeZone: string } {
  const range = validateDateRange(value)
  const entityId = (value as Record<string, unknown>)[entityIdKey]

  if (!isPositiveId(entityId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid fixture range.')
  }

  return { entityId, ...range }
}

function validateDateRange(value: unknown): RefreshFixtureWindowInput {
  if (!value || typeof value !== 'object') {
    throw new SportmonksError('invalid_input', 'Choose a valid fixture range.')
  }

  const input = value as Record<string, unknown>

  if (
    typeof input.startDate !== 'string' ||
    typeof input.endDate !== 'string' ||
    !isValidIsoDate(input.startDate) ||
    !isValidIsoDate(input.endDate) ||
    input.startDate > input.endDate
  ) {
    throw new SportmonksError('invalid_input', 'Choose a valid fixture range.')
  }

  const dayCount =
    (Date.parse(`${input.endDate}T00:00:00Z`) - Date.parse(`${input.startDate}T00:00:00Z`)) /
    86_400_000

  if (dayCount > 100) {
    throw new SportmonksError('invalid_input', 'Fixture ranges cannot exceed 100 days.')
  }

  if (typeof input.timeZone !== 'string' || !isValidTimeZone(input.timeZone)) {
    throw new SportmonksError('invalid_input', 'The selected time zone is not valid.')
  }

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: input.timeZone
  }
}

function isValidTimeZone(value: string): boolean {
  if (value.length === 0 || value.length > 100) return false

  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}
