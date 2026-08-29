import type {
  ApiErrorCode,
  CompetitionRefresh,
  CompetitionSeasonsRefresh,
  EntitySearchInput,
  EntitySearchRefresh,
  FixtureDetailRefresh,
  FixtureOddsRefresh,
  FixtureRefresh,
  PlayerAppearancesRefresh,
  PlayerRefresh,
  RefreshCompetitionFixturesInput,
  RefreshCompetitionSeasonsInput,
  RefreshFixtureInput,
  RefreshFixturesInput,
  RefreshPlayerAppearancesInput,
  RefreshPlayerInput,
  RefreshStandingsInput,
  RefreshTeamFixturesInput,
  RefreshTeamInput,
  RefreshTeamSquadInput,
  RefreshVenueInput,
  StandingsRefresh,
  SportmonksCompetition,
  SportmonksFixture,
  SportmonksOdd,
  SportmonksPlayer,
  SportmonksSeason,
  SportmonksSquadEntry,
  SportmonksStanding,
  SportmonksTeam,
  SportmonksVenue,
  TeamRefresh,
  TeamSquadRefresh,
  VenueRefresh
} from '@shared/contracts'
import { z } from 'zod'

const apiBaseUrl = 'https://api.sportmonks.com/v3/football'
const maximumPages = 100

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

const teamSchema = z
  .object({
    id: z.number().int(),
    sport_id: z.number().int(),
    country_id: z.number().int(),
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
    venue: venueSchema.nullable().optional()
  })
  .passthrough()

const positionSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    code: z.string().nullable().optional(),
    developer_name: z.string().nullable().optional()
  })
  .passthrough()

const playerSchema = z
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
    jersey_number: z.number().int().nullable()
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
    statistics: z.array(fixtureStatisticSchema).optional()
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
    group: standingContextSchema.nullable().optional()
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
    data: teamSchema,
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

const competitionSearchResponseSchema = z.object({ data: z.array(competitionSchema) }).passthrough()
const teamSearchResponseSchema = z.object({ data: z.array(teamSchema) }).passthrough()
const playerSearchResponseSchema = z.object({ data: z.array(playerSchema) }).passthrough()
const venueSearchResponseSchema = z.object({ data: z.array(venueSchema) }).passthrough()

export class SportmonksError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string
  ) {
    super(message)
  }
}

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

export function validateFixtureInput(value: unknown): RefreshFixtureInput {
  const fixtureId =
    value && typeof value === 'object' ? (value as { fixtureId?: unknown }).fixtureId : 0

  if (!isPositiveId(fixtureId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid fixture.')
  }

  return { fixtureId }
}

export function validateStandingsInput(value: unknown): RefreshStandingsInput {
  const seasonId =
    value && typeof value === 'object' ? (value as { seasonId?: unknown }).seasonId : 0

  if (!isPositiveId(seasonId)) {
    throw new SportmonksError('invalid_input', 'Choose a valid current season.')
  }

  return { seasonId }
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

export async function fetchFixtureById(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureDetailRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/fixtures/${input.fixtureId}`)
  url.searchParams.set(
    'include',
    'participants;league;state;scores;periods;venue;stage;round;lineups;events.type;events.player;events.relatedPlayer;statistics.type'
  )

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) throw errorForStatus(response.status)

  let parsed: z.infer<typeof fixtureDetailResponseSchema>

  try {
    parsed = fixtureDetailResponseSchema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }

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

export async function fetchFixtureOdds(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureOddsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/odds/pre-match/fixtures/${input.fixtureId}`)
  url.searchParams.set('include', 'bookmaker;market')

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) throw errorForStatus(response.status)

  let parsed: z.infer<typeof fixtureOddsResponseSchema>

  try {
    parsed = fixtureOddsResponseSchema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
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

async function fetchFixturePages(
  path: string,
  timeZone: string,
  token: string,
  fetcher: typeof fetch,
  filters?: string,
  includes = 'participants;league;state;scores;periods'
): Promise<FixtureRefresh> {
  const fixtures: SportmonksFixture[] = []
  const fetchedAt = Date.now()
  let page = 1
  let rateLimit: FixtureRefresh['rateLimit']
  let message: string | undefined

  while (page <= maximumPages) {
    const url = new URL(`${apiBaseUrl}/${path}`)
    url.searchParams.set('include', includes)
    url.searchParams.set('timezone', timeZone)
    url.searchParams.set('order', 'asc')
    url.searchParams.set('per_page', '50')
    url.searchParams.set('page', String(page))
    if (filters) url.searchParams.set('filters', filters)

    let response: Response

    try {
      response = await fetcher(url, {
        headers: {
          Accept: 'application/json',
          Authorization: token
        },
        signal: AbortSignal.timeout(20_000)
      })
    } catch {
      throw new SportmonksError('network', 'Could not reach Sportmonks.')
    }

    if (!response.ok) {
      throw errorForStatus(response.status)
    }

    let parsed: z.infer<typeof fixtureResponseSchema>

    try {
      parsed = fixtureResponseSchema.parse(await response.json())
    } catch {
      throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
    }

    fixtures.push(...(parsed.data as SportmonksFixture[]))
    message = parsed.message ?? message

    if (parsed.rate_limit) {
      rateLimit = {
        remaining: parsed.rate_limit.remaining,
        resetsAt: fetchedAt + parsed.rate_limit.resets_in_seconds * 1000
      }
    }

    if (!parsed.pagination.has_more) {
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

    let response: Response

    try {
      response = await fetcher(url, {
        headers: {
          Accept: 'application/json',
          Authorization: token
        },
        signal: AbortSignal.timeout(20_000)
      })
    } catch {
      throw new SportmonksError('network', 'Could not reach Sportmonks.')
    }

    if (!response.ok) {
      throw errorForStatus(response.status)
    }

    let parsed: z.infer<typeof competitionResponseSchema>

    try {
      parsed = competitionResponseSchema.parse(await response.json())
    } catch {
      throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
    }

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
  url.searchParams.set('include', 'participant;stage;group')

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) {
    throw errorForStatus(response.status)
  }

  let parsed: z.infer<typeof standingsResponseSchema>

  try {
    parsed = standingsResponseSchema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }

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

    let response: Response

    try {
      response = await fetcher(url, {
        headers: {
          Accept: 'application/json',
          Authorization: token
        },
        signal: AbortSignal.timeout(20_000)
      })
    } catch {
      throw new SportmonksError('network', 'Could not reach Sportmonks.')
    }

    if (!response.ok) throw errorForStatus(response.status)

    let parsed: z.infer<typeof seasonsResponseSchema>

    try {
      parsed = seasonsResponseSchema.parse(await response.json())
    } catch {
      throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
    }

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

export async function fetchTeamById(
  input: RefreshTeamInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/teams/${input.teamId}`)
  url.searchParams.set('include', 'country;venue')

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) {
    throw errorForStatus(response.status)
  }

  let parsed: z.infer<typeof teamResponseSchema>

  try {
    parsed = teamResponseSchema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }

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

export async function fetchTeamSquad(
  input: RefreshTeamSquadInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<TeamSquadRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`${apiBaseUrl}/squads/teams/${input.teamId}`)
  url.searchParams.set('include', 'player.nationality;position;detailedPosition')

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) throw errorForStatus(response.status)

  let parsed: z.infer<typeof teamSquadResponseSchema>

  try {
    parsed = teamSquadResponseSchema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }

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

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) throw errorForStatus(response.status)

  let parsed: z.infer<typeof playerResponseSchema>

  try {
    parsed = playerResponseSchema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }

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

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) {
    throw errorForStatus(response.status)
  }

  let parsed: z.infer<typeof venueResponseSchema>

  try {
    parsed = venueResponseSchema.parse(await response.json())
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }

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
  const [competitionResponse, teamResponse, playerResponse, venueResponse] = await Promise.all([
    fetchEntitySearchPage('leagues', query, 'country;currentSeason', token, fetcher),
    fetchEntitySearchPage('teams', query, 'country;venue', token, fetcher),
    fetchEntitySearchPage(
      'players',
      query,
      'nationality;position;detailedPosition',
      token,
      fetcher
    ),
    fetchEntitySearchPage('venues', query, 'country', token, fetcher)
  ])

  try {
    return {
      competitions: competitionSearchResponseSchema.parse(competitionResponse)
        .data as SportmonksCompetition[],
      teams: teamSearchResponseSchema.parse(teamResponse).data as SportmonksTeam[],
      players: playerSearchResponseSchema.parse(playerResponse).data as SportmonksPlayer[],
      venues: venueSearchResponseSchema.parse(venueResponse).data as SportmonksVenue[],
      fetchedAt
    }
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }
}

async function fetchEntitySearchPage(
  entity: 'leagues' | 'teams' | 'players' | 'venues',
  query: string,
  include: string,
  token: string,
  fetcher: typeof fetch
): Promise<unknown> {
  const url = new URL(`${apiBaseUrl}/${entity}/search/${query}`)
  url.searchParams.set('include', include)
  url.searchParams.set('per_page', '8')

  let response: Response

  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        Authorization: token
      },
      signal: AbortSignal.timeout(20_000)
    })
  } catch {
    throw new SportmonksError('network', 'Could not reach Sportmonks.')
  }

  if (!response.ok) throw errorForStatus(response.status)

  try {
    return await response.json()
  } catch {
    throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected response.')
  }
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
  if (!value || typeof value !== 'object') {
    throw new SportmonksError('invalid_input', 'Choose a valid fixture range.')
  }

  const input = value as Record<string, unknown>
  const entityId = input[entityIdKey]

  if (
    !isPositiveId(entityId) ||
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
    entityId,
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

function errorForStatus(status: number): SportmonksError {
  if (status === 401) {
    return new SportmonksError('unauthorized', 'Sportmonks rejected this token.')
  }

  if (status === 403) {
    return new SportmonksError('forbidden', 'Your Sportmonks plan does not include this data.')
  }

  if (status === 429) {
    return new SportmonksError('rate_limited', 'The Sportmonks rate limit has been reached.')
  }

  return new SportmonksError('upstream', `Sportmonks returned an error (${status}).`)
}
