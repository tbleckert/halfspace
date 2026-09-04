import { z } from 'zod'
import type {
  BroadcasterRefresh,
  BroadcastScheduleRefresh,
  RefreshBroadcasterInput,
  RefreshBroadcastScheduleInput
} from '@shared/contracts'
import { fixtureSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'
import { tvListingSchema, tvStationSchema } from './tv-schema'

const broadcasterInputSchema = z.object({ stationId: z.number().int().positive() })
const scheduleInputSchema = broadcasterInputSchema.extend({
  feed: z.enum(['upcoming', 'past']),
  page: z.number().int().positive()
})
const scheduleResponseSchema = z.object({
  data: z.array(fixtureSchema.extend({ tvstations: z.array(tvListingSchema) })),
  pagination: z.object({ current_page: z.number().int().positive(), has_more: z.boolean() })
})

export function validateBroadcasterInput(value: unknown): RefreshBroadcasterInput {
  const parsed = broadcasterInputSchema.safeParse(value)
  if (!parsed.success) throw new SportmonksError('invalid_input', 'Choose a valid broadcaster.')
  return parsed.data
}

export function validateBroadcastScheduleInput(value: unknown): RefreshBroadcastScheduleInput {
  const parsed = scheduleInputSchema.safeParse(value)
  if (!parsed.success)
    throw new SportmonksError('invalid_input', 'Choose a valid broadcast schedule page.')
  return parsed.data
}

export async function fetchBroadcaster(
  input: RefreshBroadcasterInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<BroadcasterRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/tv-stations/${input.stationId}`)
  const { data } = await requestSportmonks(url, token, z.object({ data: tvStationSchema }), fetcher)
  if (data.id !== input.stationId)
    throw new SportmonksError('invalid_response', 'Sportmonks returned a different broadcaster.')
  return { station: data, fetchedAt }
}

export async function fetchBroadcastSchedule(
  input: RefreshBroadcastScheduleInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<BroadcastScheduleRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(
    `https://api.sportmonks.com/v3/football/fixtures/${input.feed}/tv-stations/${input.stationId}`
  )
  url.searchParams.set(
    'include',
    'participants;league;state;scores;periods;tvStations.tvStation;tvStations.country'
  )
  url.searchParams.set('page', String(input.page))
  url.searchParams.set('per_page', '25')
  url.searchParams.set('order', input.feed === 'past' ? 'desc' : 'asc')
  const { data, pagination } = await requestSportmonks(url, token, scheduleResponseSchema, fetcher)
  if (
    pagination.current_page !== input.page ||
    data.some((fixture) => fixture.tvstations.some((listing) => listing.fixture_id !== fixture.id))
  ) {
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned a different broadcast schedule page.'
    )
  }
  const fixtures: BroadcastScheduleRefresh['fixtures'] = []
  const listings: BroadcastScheduleRefresh['listings'] = []
  for (const { tvstations, ...fixture } of data) {
    fixtures.push(fixture)
    listings.push(...tvstations.filter((listing) => listing.tvstation_id === input.stationId))
  }
  return {
    ...input,
    fixtures,
    listings,
    hasMore: pagination.has_more,
    fetchedAt
  }
}
