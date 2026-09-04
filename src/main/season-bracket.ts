import { z } from 'zod'
import type {
  RefreshSeasonScheduleInput,
  SeasonBracketRefresh,
  SportmonksKnockoutStage
} from '@shared/contracts'
import { fixtureSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const aggregateSchema = z.object({
  id: z.number().int(),
  league_id: z.number().int(),
  season_id: z.number().int(),
  stage_id: z.number().int(),
  name: z.string(),
  fixture_ids: z.array(z.number().int()),
  result: z.string().nullable(),
  detail: z.string().nullable(),
  winner_participant_id: z.number().int().nullable()
})
const bracketSchema = z.object({
  data: z.object({
    stages: z.array(
      z.object({
        stage_id: z.number().int(),
        stage_name: z.string(),
        fixtures: z.array(fixtureSchema)
      })
    ),
    edges: z.array(
      z.object({
        id: z.number().int(),
        season_id: z.number().int(),
        parent_fixture_id: z.number().int(),
        child_fixture_id: z.number().int(),
        parent_outcome: z.enum(['winner', 'loser']),
        child_slot: z.enum(['home', 'away'])
      })
    )
  })
})
const stagesSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      season_id: z.number().int(),
      type_id: z.number().int(),
      name: z.string(),
      sort_order: z.number().int(),
      starting_at: z.string().nullish(),
      ending_at: z.string().nullish(),
      aggregates: z.array(aggregateSchema)
    })
  ),
  pagination: z
    .object({ current_page: z.number().int().positive(), has_more: z.boolean() })
    .optional()
})

export async function fetchSeasonBracket(
  input: RefreshSeasonScheduleInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<SeasonBracketRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/seasons/${input.seasonId}/brackets`)
  url.searchParams.set('include', 'participants;scores;state;periods')
  const { data } = await requestSportmonks(url, token, bracketSchema, fetcher)
  if (
    data.edges.some((edge) => edge.season_id !== input.seasonId) ||
    data.stages.some((stage) =>
      stage.fixtures.some(
        (fixture) => fixture.season_id !== input.seasonId || fixture.stage_id !== stage.stage_id
      )
    )
  ) {
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned bracket relationships for another season.'
    )
  }
  const catalog: SportmonksKnockoutStage[] = []
  const stagesUrl = new URL(
    `https://api.sportmonks.com/v3/football/stages/seasons/${input.seasonId}`
  )
  stagesUrl.searchParams.set('include', 'aggregates')
  stagesUrl.searchParams.set('per_page', '50')
  for (let page = 1; page <= 100; page++) {
    stagesUrl.searchParams.set('page', String(page))
    const result = await requestSportmonks(new URL(stagesUrl), token, stagesSchema, fetcher)
    if (
      result.data.some(
        (stage) =>
          stage.season_id !== input.seasonId ||
          stage.aggregates.some(
            (aggregate) => aggregate.season_id !== input.seasonId || aggregate.stage_id !== stage.id
          )
      )
    ) {
      throw new SportmonksError(
        'invalid_response',
        'Sportmonks returned knockout relationships for another season.'
      )
    }
    if (result.pagination && result.pagination.current_page !== page)
      throw new SportmonksError('invalid_response', 'Sportmonks returned an unexpected stage page.')
    catalog.push(...result.data.filter((stage) => stage.type_id === 224))
    if (!result.pagination?.has_more) return { ...data, catalog, fetchedAt }
  }
  throw new SportmonksError('invalid_response', 'Sportmonks returned too many stage pages.')
}
