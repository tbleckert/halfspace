import { z } from 'zod'
import type { PredictedLineupsRefresh, RefreshFixtureInput } from '@shared/contracts'
import { lineupSchema } from './sportmonks'
import { requestSportmonks, SportmonksError } from './sportmonks-client'

const responseSchema = z.object({
  data: z.object({ id: z.number().int(), predictedlineups: z.array(lineupSchema) })
})

export async function fetchPredictedLineups(
  input: RefreshFixtureInput,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<PredictedLineupsRefresh> {
  const fetchedAt = Date.now()
  const url = new URL(`https://api.sportmonks.com/v3/football/fixtures/${input.fixtureId}`)
  url.searchParams.set('include', 'predictedLineups.player')
  url.searchParams.set('select', 'id')
  const { data } = await requestSportmonks(url, token, responseSchema, fetcher)
  if (
    data.id !== input.fixtureId ||
    data.predictedlineups.some(
      (entry) => entry.fixture_id !== input.fixtureId || entry.type_id !== 111384
    )
  )
    throw new SportmonksError(
      'invalid_response',
      'Sportmonks returned inconsistent lineup predictions.'
    )
  return { fixtureId: input.fixtureId, lineups: data.predictedlineups, fetchedAt }
}
