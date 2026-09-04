import { expect, it, vi } from 'vitest'
import { fetchMatchFacts } from './match-facts'
const fact = {
  id: 1,
  fixture_id: 10,
  type_id: 76097,
  participant: 'home',
  basis: 'team',
  scope: 'league_matches',
  category: 'streaks',
  natural_language: 'Unbeaten in 87 of the last 100 matches.',
  type: { id: 76097, name: 'Unbeaten' }
}
it('loads every page without interpreting counts as consecutive streaks', async () => {
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    const page = Number(new URL(String(url)).searchParams.get('page'))
    return Response.json({
      data: [{ ...fact, id: page }],
      pagination: { current_page: page, has_more: page === 1 }
    })
  })
  const result = await fetchMatchFacts({ fixtureId: 10 }, 'token', fetcher)
  expect(result.facts).toHaveLength(2)
  expect(result.facts[0].natural_language).toBe(fact.natural_language)
})
it('rejects a partial paginated result and wrong-fixture data', async () => {
  await expect(
    fetchMatchFacts({ fixtureId: 10 }, 'token', async (url) =>
      new URL(String(url)).searchParams.get('page') === '1'
        ? Response.json({ data: [fact], pagination: { current_page: 1, has_more: true } })
        : new Response('', { status: 500 })
    )
  ).rejects.toThrow()
  await expect(
    fetchMatchFacts({ fixtureId: 10 }, 'token', async () =>
      Response.json({
        data: [{ ...fact, fixture_id: 11 }],
        pagination: { current_page: 1, has_more: false }
      })
    )
  ).rejects.toThrow(/fixture/i)
})
