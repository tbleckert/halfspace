import { afterAll, beforeEach, expect, it } from 'vitest'
import type { SportmonksTeam } from '@shared/contracts'
import { clearSportmonksCache, db, toCachedIncludedTeam } from './db'
import { readTeamDirectory, writeTeamDirectory } from './team-directory-cache'
import { toggleTeamPin } from '@/features/teams/use-team-pins'

const team: SportmonksTeam = {
  id: 1,
  sport_id: 1,
  country_id: 8,
  venue_id: null,
  gender: 'male',
  name: 'Town',
  founded: null,
  placeholder: false
}
beforeEach(async () => {
  await clearSportmonksCache()
  await db.teamPins.clear()
})
afterAll(() => db.close())

it('keeps pages separate, explicit hasMore, and richer newer shared identities', async () => {
  const rich = {
    ...team,
    name: 'New name',
    socials: [{ id: 1, value: 'https://example.com', type: { id: 1, name: 'Website' } }]
  }
  await db.teams.put(toCachedIncludedTeam(rich, undefined, 200))
  await writeTeamDirectory({ page: 1 }, { page: 1, teams: [team], hasMore: true, fetchedAt: 100 })
  await writeTeamDirectory(
    { page: 2 },
    { page: 2, teams: [{ ...team, id: 2 }], hasMore: false, fetchedAt: 100 }
  )
  expect((await readTeamDirectory({ page: 1 })).teams.map(({ name }) => name)).toEqual(['New name'])
  expect((await readTeamDirectory({ page: 1 })).query?.hasMore).toBe(true)
  expect((await readTeamDirectory({ page: 2 })).teams.map(({ id }) => id)).toEqual([2])
  expect((await db.teams.get(1))?.raw.socials).toEqual(rich.socials)
  expect((await readTeamDirectory({ page: 1, countryId: 8 })).query).toBeNull()
})

it('rejects another query and does not let late page responses roll back membership', async () => {
  await expect(
    writeTeamDirectory({ page: 1 }, { page: 2, teams: [team], hasMore: false, fetchedAt: 100 })
  ).rejects.toThrow('does not match')
  await writeTeamDirectory({ page: 1 }, { page: 1, teams: [team], hasMore: false, fetchedAt: 200 })
  await writeTeamDirectory({ page: 1 }, { page: 1, teams: [], hasMore: true, fetchedAt: 100 })
  expect((await readTeamDirectory({ page: 1 })).teams).toHaveLength(1)
  expect((await readTeamDirectory({ page: 1 })).query?.hasMore).toBe(false)
})

it('persists pins independently of disposable football caches and toggles atomically', async () => {
  const pin = { id: team.id, name: team.name, imagePath: null }
  await toggleTeamPin(pin)
  await clearSportmonksCache()
  expect((await db.teamPins.get(team.id))?.name).toBe('Town')
  await Promise.all([toggleTeamPin(pin), toggleTeamPin(pin)])
  expect(await db.teamPins.count()).toBe(1)
  await toggleTeamPin(pin)
  expect(await db.teamPins.count()).toBe(0)
})
