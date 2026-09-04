import { expect, it } from 'vitest'
import { fetchPredictedLineups } from './predicted-lineups'
const lineup = {
  id: 1,
  fixture_id: 10,
  player_id: 20,
  team_id: 19,
  position_id: 27,
  type_id: 111384,
  formation_field: '4:1',
  player_name: 'Player',
  jersey_number: 9
}
it('requests only the predicted relationship and keeps its identity distinct', async () => {
  const result = await fetchPredictedLineups({ fixtureId: 10 }, 'token', async (url) => {
    expect(new URL(String(url)).searchParams.get('include')).toBe('predictedLineups.player')
    return Response.json({ data: { id: 10, predictedlineups: [lineup] } })
  })
  expect(result.lineups[0].type_id).toBe(111384)
  expect(result.fixtureId).toBe(10)
})
it('rejects predictions for another fixture and unexpected lineup kinds', async () => {
  for (const entry of [
    { ...lineup, fixture_id: 11 },
    { ...lineup, type_id: 11 }
  ]) {
    await expect(
      fetchPredictedLineups({ fixtureId: 10 }, 'token', async () =>
        Response.json({ data: { id: 10, predictedlineups: [entry] } })
      )
    ).rejects.toThrow(/prediction/i)
  }
})
