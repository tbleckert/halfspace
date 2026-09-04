import { z } from 'zod'
import type { MatchFactsRefresh, RefreshFixtureInput, SportmonksMatchFact } from '@shared/contracts'
import { requestSportmonks, SportmonksError } from './sportmonks-client'
const responseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      fixture_id: z.number().int(),
      type_id: z.number().int(),
      participant: z.enum(['home', 'away', 'both', 'referee']),
      basis: z.string(),
      scope: z.string(),
      category: z.string(),
      natural_language: z.string().nullable(),
      type: z.object({ id: z.number().int(), name: z.string() }).nullable()
    })
  ),
  pagination: z.object({ current_page: z.number().int().positive(), has_more: z.boolean() })
})
export async function fetchMatchFacts(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<MatchFactsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/match-facts/${input.fixtureId}`)
  url.searchParams.set('include', 'type')
  url.searchParams.set('per_page', '50')
  const facts = new Map<number, SportmonksMatchFact>()
  for (let page = 1; page <= 100; page++) {
    url.searchParams.set('page', String(page))
    const response = await requestSportmonks(new URL(url), token, responseSchema, fetcher)
    if (
      response.pagination.current_page !== page ||
      response.data.some((fact) => fact.fixture_id !== input.fixtureId)
    )
      throw new SportmonksError(
        'invalid_response',
        'Sportmonks returned facts for another page or fixture.'
      )
    for (const fact of response.data) facts.set(fact.id, fact)
    if (!response.pagination.has_more)
      return { fixtureId: input.fixtureId, facts: [...facts.values()], fetchedAt }
  }
  throw new SportmonksError('invalid_response', 'Sportmonks returned too many match fact pages.')
}
