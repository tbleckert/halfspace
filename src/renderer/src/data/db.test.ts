import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { CompetitionRefresh, FixtureRefresh } from '@shared/contracts'
import {
  db,
  readCompetitionCatalog,
  readFixtureQuery,
  setCompetitionPinned,
  writeCompetitionRefresh,
  writeFixtureRefresh
} from './db'

beforeEach(async () => {
  if (!db.isOpen()) await db.open()

  await db.transaction(
    'rw',
    db.fixtures,
    db.fixtureQueries,
    db.competitions,
    db.competitionCatalogs,
    db.competitionPins,
    async () => {
      await db.fixtures.clear()
      await db.fixtureQueries.clear()
      await db.competitions.clear()
      await db.competitionCatalogs.clear()
      await db.competitionPins.clear()
    }
  )
})

afterAll(() => db.close())

describe('fixture cache', () => {
  it('writes the query and fixtures together while respecting participant locations', async () => {
    const refresh: FixtureRefresh = {
      fetchedAt: Date.UTC(2026, 7, 27, 10),
      pageCount: 1,
      timeZone: 'Europe/Stockholm',
      fixtures: [
        {
          id: 19425456,
          league_id: 8,
          season_id: 23614,
          state_id: 1,
          name: 'Away vs Home',
          starting_at_timestamp: 1_787_848_400,
          placeholder: false,
          has_odds: true,
          participants: [
            { id: 22, name: 'Away', meta: { location: 'away' } },
            { id: 11, name: 'Home', meta: { location: 'home' } }
          ],
          scores: []
        }
      ]
    }

    await writeFixtureRefresh('2026-08-27', 'Europe/Stockholm', refresh)
    const cached = await readFixtureQuery('2026-08-27', 'Europe/Stockholm')

    expect(cached.query?.fixtureIds).toEqual([19425456])
    expect(cached.fixtures[0]).toMatchObject({
      homeTeamId: 11,
      awayTeamId: 22
    })
  })

  it('caches an empty provider response', async () => {
    await writeFixtureRefresh('2026-08-28', 'UTC', {
      fetchedAt: Date.UTC(2026, 7, 27, 10),
      pageCount: 1,
      timeZone: 'UTC',
      fixtures: []
    })

    const cached = await readFixtureQuery('2026-08-28', 'UTC')
    expect(cached.query).not.toBeNull()
    expect(cached.fixtures).toEqual([])
  })
})

describe('competition cache', () => {
  it('replaces the subscribed catalogue while preserving local pins', async () => {
    const firstRefresh = competitionRefresh([
      { id: 8, name: 'Premier League' },
      { id: 384, name: 'Serie A' }
    ])

    await writeCompetitionRefresh(firstRefresh)
    await setCompetitionPinned(384, true)
    await writeCompetitionRefresh(competitionRefresh([{ id: 384, name: 'Serie A' }]))

    const cached = await readCompetitionCatalog()
    expect(cached.competitions.map(({ id }) => id)).toEqual([384])
    expect(await db.competitionPins.get(384)).toMatchObject({ competitionId: 384 })
  })
})

function competitionRefresh(competitions: Array<{ id: number; name: string }>): CompetitionRefresh {
  return {
    fetchedAt: Date.UTC(2026, 7, 28, 10),
    pageCount: 1,
    competitions: competitions.map(({ id, name }) => ({
      id,
      country_id: 1,
      name,
      active: true,
      image_path: `https://cdn.sportmonks.com/images/soccer/leagues/${id}.png`
    }))
  }
}
