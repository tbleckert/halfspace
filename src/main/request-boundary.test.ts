import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSportmonksRateLimits } from './sportmonks-client'
import {
  fetchFixtureById,
  fetchFixturesByDate,
  fetchLiveFixtures,
  fetchTeamById
} from './sportmonks'

describe('Sportmonks request boundaries', () => {
  beforeEach(clearSportmonksRateLimits)
  afterEach(() => vi.restoreAllMocks())
  it('does not send more fixture requests until their reported limit resets', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      new URL(url.toString()).pathname.includes('/teams/')
        ? new Response(null, { status: 403 })
        : Response.json(
            { rate_limit: { remaining: 0, requested_entity: 'Fixture', resets_in_seconds: 60 } },
            { status: 429 }
          )
    )

    await expect(
      fetchFixtureById({ fixtureId: 1 }, 'limited-token', fetcher)
    ).rejects.toMatchObject({ code: 'rate_limited' })
    await expect(
      fetchFixturesByDate({ date: '2026-09-03', timeZone: 'UTC' }, 'limited-token', fetcher)
    ).rejects.toMatchObject({ code: 'rate_limited' })
    await expect(
      fetchLiveFixtures({ timeZone: 'UTC' }, 'limited-token', fetcher)
    ).rejects.toMatchObject({ code: 'rate_limited' })
    expect(fetcher).toHaveBeenCalledTimes(1)

    await expect(fetchTeamById({ teamId: 1 }, 'limited-token', fetcher)).rejects.toMatchObject({
      code: 'forbidden'
    })
    expect(fetcher).toHaveBeenCalledTimes(2)

    now.mockReturnValue(1_060_000)
    await expect(
      fetchFixtureById({ fixtureId: 1 }, 'limited-token', fetcher)
    ).rejects.toMatchObject({ code: 'rate_limited' })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('keeps token limits separate and clears them when credentials change', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 429 }))
    await expect(fetchFixtureById({ fixtureId: 1 }, 'first-token', fetcher)).rejects.toMatchObject({
      code: 'rate_limited'
    })
    await expect(fetchFixtureById({ fixtureId: 2 }, 'second-token', fetcher)).rejects.toMatchObject(
      { code: 'rate_limited' }
    )
    expect(fetcher).toHaveBeenCalledTimes(2)

    clearSportmonksRateLimits()
    await expect(fetchFixtureById({ fixtureId: 1 }, 'first-token', fetcher)).rejects.toMatchObject({
      code: 'rate_limited'
    })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('does not reinstate cleared limits from an old in-flight response', async () => {
    let respond!: (response: Response) => void
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            respond = resolve
          })
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
    const pending = fetchFixtureById({ fixtureId: 1 }, 'old-token', fetcher)
    clearSportmonksRateLimits()
    respond(new Response(null, { status: 429 }))
    await expect(pending).rejects.toMatchObject({ code: 'rate_limited' })
    await expect(fetchFixtureById({ fixtureId: 1 }, 'old-token', fetcher)).rejects.toMatchObject({
      code: 'unauthorized'
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not return a silently truncated fixture window at the safety page limit', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [],
        pagination: { current_page: 1, has_more: true }
      })
    )

    await expect(
      fetchFixturesByDate({ date: '2026-09-03', timeZone: 'UTC' }, 'pagination-token', fetcher)
    ).rejects.toMatchObject({
      code: 'invalid_response',
      message: 'Sportmonks returned too many result pages.'
    })
    expect(fetcher).toHaveBeenCalledTimes(100)
  })
})
