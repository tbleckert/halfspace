import { expect, it } from 'vitest'
import { fetchHonours, validateHonoursInput } from './honours'
const honour = {
  id: 1,
  participant_id: 19,
  team_id: null,
  league_id: 8,
  season_id: 12,
  trophy_id: 2,
  trophy: { id: 2, name: 'Runner-up', position: 2 },
  league: { id: 8, name: 'Premier League' },
  season: { id: 12, league_id: 8, name: '2025/2026' }
}
it('keeps winner and runner-up records distinct across entity types', async () => {
  for (const entity of ['teams', 'players', 'coaches'] as const) {
    const result = await fetchHonours({ entity, entityId: 19 }, 'token', async () =>
      Response.json({
        data: {
          id: 19,
          trophies: [
            honour,
            { ...honour, id: 2, trophy_id: 1, trophy: { id: 1, name: 'Winner', position: 1 } }
          ]
        }
      })
    )
    expect(result.honours.map((item) => item.trophy?.position)).toEqual([2, 1])
  }
})
it('rejects mismatched participants and unsupported entity paths', async () => {
  expect(() => validateHonoursInput({ entity: 'fixtures', entityId: 1 })).toThrow()
  await expect(
    fetchHonours({ entity: 'teams', entityId: 19 }, 'token', async () =>
      Response.json({ data: { id: 19, trophies: [{ ...honour, participant_id: 9 }] } })
    )
  ).rejects.toThrow(/honour/i)
})
