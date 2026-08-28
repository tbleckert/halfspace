import type {
  ApiErrorCode,
  CompetitionRefresh,
  FixtureRefresh,
  RefreshFixturesInput,
  SportmonksCompetition,
  SportmonksFixture
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
    country: countrySchema.nullable().optional()
  })
  .passthrough()

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

const fixtureSchema = z
  .object({
    id: z.number().int(),
    league_id: z.number().int(),
    season_id: z.number().int(),
    state_id: z.number().int(),
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
      .default([])
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

export async function fetchFixturesByDate(
  input: RefreshFixturesInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureRefresh> {
  const fixtures: SportmonksFixture[] = []
  const fetchedAt = Date.now()
  let page = 1
  let rateLimit: FixtureRefresh['rateLimit']
  let message: string | undefined

  while (page <= maximumPages) {
    const url = new URL(`${apiBaseUrl}/fixtures/date/${input.date}`)
    url.searchParams.set('include', 'participants;league;state;scores')
    url.searchParams.set('timezone', input.timeZone)
    url.searchParams.set('order', 'asc')
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
        timeZone: parsed.timezone ?? input.timeZone,
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
    url.searchParams.set('include', 'country')
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
