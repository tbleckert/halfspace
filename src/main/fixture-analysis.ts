import { z } from 'zod'
import type {
  ExpectedLineupsRefresh,
  FixtureExpectedMetricsRefresh,
  FixturePredictionsRefresh,
  FixturePeriodStatisticsRefresh,
  RefreshFixtureInput
} from '@shared/contracts'
import { fixtureStatisticSchema, lineupSchema, typeSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const expectedMetricsSchema = z.object({
  data: z.object({ id: z.number().int(), xgfixture: z.array(fixtureStatisticSchema) })
})
const probabilitySchema = z.number().min(0).max(100)
const predictionSchema = z.object({
  id: z.number().int(),
  fixture_id: z.number().int(),
  type_id: z.number().int(),
  predictions: z.record(
    z.string(),
    z.union([probabilitySchema, z.record(z.string(), probabilitySchema)])
  ),
  type: typeSchema.nullish()
})
const predictionsSchema = z.object({
  data: z.array(predictionSchema),
  pagination: z.object({ has_more: z.boolean() }).optional()
})
const expectedLineupsSchema = z.object({
  data: z.object({ id: z.number().int(), expectedlineups: z.array(lineupSchema) })
})
const periodStatisticsSchema = z.object({
  data: z.object({
    id: z.number().int(),
    participants: z.array(
      z.object({ id: z.number().int(), meta: z.object({ location: z.enum(['home', 'away']) }) })
    ),
    periods: z.array(
      z.object({
        id: z.number().int(),
        fixture_id: z.number().int(),
        type_id: z.number().int(),
        description: z.string(),
        sort_order: z.number().int(),
        statistics: z.array(
          fixtureStatisticSchema.omit({ location: true }).extend({ period_id: z.number().int() })
        )
      })
    )
  })
})

export async function fetchFixtureExpectedMetrics(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixtureExpectedMetricsRefresh> {
  const fetchedAt = Date.now()
  const url = fixtureUrl(input.fixtureId, 'xGFixture.type')
  url.searchParams.set('filters', 'fixtureStatisticTypes:5304,5305,7939,7943')
  const { data } = await requestSportmonks(url, token, expectedMetricsSchema, fetcher)
  if (data.id !== input.fixtureId || data.xgfixture.some((s) => s.fixture_id !== input.fixtureId))
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned expected metrics for another fixture.'
    )
  return { fixtureId: input.fixtureId, statistics: data.xgfixture, fetchedAt }
}

export async function fetchFixturePredictions(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixturePredictionsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(
    `https://api.sportmonks.com/v3/football/predictions/probabilities/fixtures/${input.fixtureId}`
  )
  url.searchParams.set('include', 'type')
  url.searchParams.set('filters', 'predictionTypes:237,231,235,240')
  const { data, pagination } = await requestSportmonks(url, token, predictionsSchema, fetcher)
  if (pagination?.has_more)
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned incomplete fixture predictions.'
    )
  if (data.some((p) => p.fixture_id !== input.fixtureId))
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned predictions for another fixture.'
    )
  return { fixtureId: input.fixtureId, predictions: data, fetchedAt }
}

export async function fetchExpectedLineups(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<ExpectedLineupsRefresh> {
  const fetchedAt = Date.now()
  const { data } = await requestSportmonks(
    fixtureUrl(input.fixtureId, 'expectedLineups.player'),
    token,
    expectedLineupsSchema,
    fetcher
  )
  if (
    data.id !== input.fixtureId ||
    data.expectedlineups.some(
      (l) =>
        l.fixture_id !== input.fixtureId ||
        ![77614, 77615].includes(l.type_id) ||
        (l.player && l.player.id !== l.player_id)
    )
  )
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned inconsistent expected lineups.'
    )
  return { fixtureId: input.fixtureId, lineups: data.expectedlineups, fetchedAt }
}

export async function fetchFixturePeriodStatistics(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<FixturePeriodStatisticsRefresh> {
  const fetchedAt = Date.now()
  const { data } = await requestSportmonks(
    fixtureUrl(input.fixtureId, 'participants;periods.statistics.type'),
    token,
    periodStatisticsSchema,
    fetcher
  )
  if (
    data.id !== input.fixtureId ||
    data.periods.some(
      (p) =>
        p.fixture_id !== input.fixtureId ||
        p.statistics.some((s) => s.fixture_id !== input.fixtureId || s.period_id !== p.id)
    )
  )
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned statistics for another fixture or period.'
    )
  const locations = new Map(
    data.participants.map((participant) => [participant.id, participant.meta.location])
  )
  const periods = data.periods.map((period) => ({
    ...period,
    statistics: period.statistics.map((statistic) => {
      const location = locations.get(statistic.participant_id)
      if (!location)
        throw new SportmonksError(
          'invalid_response',
          'Sportmonks returned period statistics for an unknown participant.'
        )
      return { ...statistic, location }
    })
  }))
  return { fixtureId: input.fixtureId, periods, fetchedAt }
}

function fixtureUrl(fixtureId: number, include: string): URL {
  const url = new URL(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`)
  url.searchParams.set('include', include)
  url.searchParams.set('select', 'id')
  return url
}
