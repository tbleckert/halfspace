import { expect, it } from 'vitest'
import {
  fetchFixtureExpectedMetrics,
  fetchFixturePredictions,
  fetchFixturePeriodStatistics,
  fetchExpectedLineups
} from './fixture-analysis'

const statistic = {
  id: 1,
  fixture_id: 10,
  type_id: 5304,
  participant_id: 19,
  location: 'home',
  data: { value: 0 }
}

it('fetches match xG separately and preserves reported zero values', async () => {
  const result = await fetchFixtureExpectedMetrics({ fixtureId: 10 }, 'token', async (url) => {
    expect(new URL(String(url)).searchParams.get('include')).toBe('xGFixture.type')
    return Response.json({ data: { id: 10, xgfixture: [statistic] } })
  })
  expect(result.statistics[0].data.value).toBe(0)
})

it('rejects expected metrics from a different fixture', async () => {
  await expect(
    fetchFixtureExpectedMetrics({ fixtureId: 10 }, 'token', async () =>
      Response.json({ data: { id: 10, xgfixture: [{ ...statistic, fixture_id: 11 }] } })
    )
  ).rejects.toThrow(/fixture/i)
})

it('requests only the prediction categories shown and validates probabilities', async () => {
  const result = await fetchFixturePredictions({ fixtureId: 10 }, 'token', async (url) => {
    const request = new URL(String(url))
    expect(request.pathname).toBe('/v3/football/predictions/probabilities/fixtures/10')
    expect(request.searchParams.get('filters')).toBe('predictionTypes:237,231,235,240')
    return Response.json({
      data: [{ id: 1, fixture_id: 10, type_id: 237, predictions: { home: 0, draw: 25, away: 75 } }]
    })
  })
  expect(result.predictions[0].predictions).toEqual({ home: 0, draw: 25, away: 75 })
  for (const invalid of [{ home: 101 }, { home: -1 }, { home: '50' }]) {
    await expect(
      fetchFixturePredictions({ fixtureId: 10 }, 'token', async () =>
        Response.json({ data: [{ id: 1, fixture_id: 10, type_id: 237, predictions: invalid }] })
      )
    ).rejects.toThrow()
  }
})

it('keeps an empty prediction response separate from denied access', async () => {
  expect(
    (
      await fetchFixturePredictions({ fixtureId: 10 }, 'token', async () =>
        Response.json({ data: [] })
      )
    ).predictions
  ).toEqual([])
  await expect(
    fetchFixturePredictions({ fixtureId: 10 }, 'token', async () =>
      Response.json({}, { status: 403 })
    )
  ).rejects.toMatchObject({ code: 'forbidden' })
})

it('rejects a prediction for another fixture', async () => {
  await expect(
    fetchFixturePredictions({ fixtureId: 10 }, 'token', async () =>
      Response.json({
        data: [{ id: 1, fixture_id: 11, type_id: 231, predictions: { yes: 20, no: 80 } }]
      })
    )
  ).rejects.toThrow(/fixture/i)
})

it('rejects an incomplete prediction response', async () => {
  await expect(
    fetchFixturePredictions({ fixtureId: 10 }, 'token', async () =>
      Response.json({ data: [], pagination: { has_more: true } })
    )
  ).rejects.toThrow(/incomplete/i)
})

it('keeps period records separate and rejects mixed fixture or period identities', async () => {
  const period = {
    id: 20,
    fixture_id: 10,
    type_id: 1,
    description: '1st-half',
    sort_order: 1,
    statistics: [{ ...statistic, location: undefined, period_id: 20 }]
  }
  const request = (periods: unknown[]): ReturnType<typeof fetchFixturePeriodStatistics> =>
    fetchFixturePeriodStatistics({ fixtureId: 10 }, 'token', async (url) => {
      expect(new URL(String(url)).searchParams.get('include')).toBe(
        'participants;periods.statistics.type'
      )
      return Response.json({
        data: { id: 10, participants: [{ id: 19, meta: { location: 'away' } }], periods }
      })
    })
  expect((await request([period])).periods[0].statistics[0].data.value).toBe(0)
  expect((await request([period])).periods[0].statistics[0].location).toBe('away')
  await expect(request([{ ...period, fixture_id: 11 }])).rejects.toThrow(/fixture/i)
  await expect(
    request([{ ...period, statistics: [{ ...statistic, period_id: 21 }] }])
  ).rejects.toThrow(/period/i)
  await expect(
    request([{ ...period, statistics: [{ ...statistic, participant_id: 99, period_id: 20 }] }])
  ).rejects.toThrow(/participant/i)
})

it('keeps expected starters and bench separate from confirmed and basic predicted lineups', async () => {
  const lineup = {
    id: 1,
    fixture_id: 10,
    player_id: 20,
    team_id: 19,
    position_id: null,
    type_id: 77614,
    formation_field: null,
    player_name: 'Player',
    jersey_number: null
  }
  const result = await fetchExpectedLineups({ fixtureId: 10 }, 'token', async (url) => {
    expect(new URL(String(url)).searchParams.get('include')).toBe('expectedLineups.player')
    return Response.json({
      data: { id: 10, expectedlineups: [lineup, { ...lineup, id: 2, type_id: 77615 }] }
    })
  })
  expect(result.lineups.map((l) => l.type_id)).toEqual([77614, 77615])
  await expect(
    fetchExpectedLineups({ fixtureId: 10 }, 'token', async () =>
      Response.json({ data: { id: 10, expectedlineups: [{ ...lineup, type_id: 11 }] } })
    )
  ).rejects.toThrow(/lineup/i)
})
