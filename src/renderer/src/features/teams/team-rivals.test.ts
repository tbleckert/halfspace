import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readTeamRivals,
  writeTeamRivalsRefresh,
  writeTeamRefresh
} from '@/data/db'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

describe('team rivalries', () => {
  it('normalizes either direction without duplicates and preserves detailed club data', async () => {
    const team = {
      id: 2,
      sport_id: 1,
      country_id: 1,
      name: 'Rival Club',
      venue_id: 3,
      gender: 'male',
      founded: null,
      placeholder: false
    }
    await writeTeamRefresh({
      fetchedAt: Date.now(),
      team: { ...team, venue: { id: 3, name: 'Stadium' } }
    })
    await writeTeamRivalsRefresh(1, {
      fetchedAt: Date.now(),
      rivals: [
        { team_id: 1, rival_id: 2, rival: team },
        { team_id: 2, rival_id: 1, team },
        { team_id: 1, rival_id: 4 },
        { team_id: 5, rival_id: 6 }
      ]
    })
    const cached = await readTeamRivals(1)
    expect(cached?.rivals.map((rival) => rival.id)).toEqual([2, 4])
    expect(cached?.rivals[0].team?.raw.venue?.name).toBe('Stadium')
    expect(cached?.rivals[1].team).toBeNull()
    expect(await readTeamRivals(9)).toBeNull()
    await clearSportmonksCache()
    expect(await readTeamRivals(1)).toBeNull()
  })
})
