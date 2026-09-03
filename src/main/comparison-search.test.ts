import { expect, it, vi } from 'vitest'
import { fetchEntitySearch, validateEntitySearchInput } from './sportmonks'

it('searches only the requested comparison entity and rejects unsupported scopes', async () => {
  expect(validateEntitySearchInput({ query: ' Roma ', entity: 'teams' })).toEqual({
    query: 'Roma',
    entity: 'teams'
  })
  expect(() => validateEntitySearchInput({ query: 'Roma', entity: 'secrets' })).toThrow()
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify({ data: [] })))
  const result = await fetchEntitySearch({ query: 'Roma', entity: 'teams' }, 'test-token', fetcher)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(String(fetcher.mock.calls[0][0])).toContain('/teams/search/Roma')
  expect(result.players).toEqual([])
})
