import { describe, expect, it, vi } from 'vitest'
import { fetchSubscription } from './subscription'

describe('subscription access', () => {
  it('reads complete resources and enrichments without exposing billing or credentials', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: 184, description: 'Tv Stations By Fixture' }],
          subscription: [
            {
              meta: { next_billing_cycle: 'private billing detail' },
              plans: [{ plan: 'Starter', sport: 'Football', category: 'Advanced' }],
              add_ons: [{ add_on: 'Odds', sport: 'Football', category: 'Odds' }]
            }
          ]
        })
      )
      .mockResolvedValueOnce(Response.json({ data: [{ id: 96, name: 'Access tv Stations' }] }))

    const result = await fetchSubscription('private-token', fetcher)
    expect(result).toEqual({
      resources: [{ id: 184, description: 'Tv Stations By Fixture' }],
      enrichments: [{ id: 96, name: 'Access tv Stations' }],
      plans: [{ name: 'Starter', category: 'Advanced' }],
      addOns: ['Odds'],
      fetchedAt: expect.any(Number)
    })
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.sportmonks.com/v3/my/resources',
      'https://api.sportmonks.com/v3/my/enrichments'
    ])
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'private-token'
    })
  })

  it('does not interpret an invalid or partial response as no access', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ message: 'Unavailable' }))
    await expect(fetchSubscription('token', fetcher)).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('keeps access denial distinct from a valid empty resource list', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status: 403 }))
    await expect(fetchSubscription('token', fetcher)).rejects.toMatchObject({ code: 'forbidden' })
  })
})
