// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, teamFixtureQueryKey, type CachedFixture } from '@/data/db'
import { teamFixtureInput } from '@/features/teams/use-team'
import { toggleTeamPin } from '@/features/teams/use-team-pins'
import { YourTeams } from './your-teams'

const homeTeam = { id: 11, name: 'Northbridge United', imagePath: null }
const awayTeam = { id: 22, name: 'Southbank Athletic', imagePath: null }
beforeEach(async () => {
  await Promise.all([db.teamPins.clear(), db.teamFixtureQueries.clear(), db.fixtures.clear()])
})
afterEach(cleanup)
afterAll(() => db.close())

describe('My teams cards', () => {
  it('places the section heading outside cards and reacts to pins', async () => {
    await seed(11, [fixture(1)])
    renderTeams()
    await screen.findByRole('link', { name: 'Browse teams' })
    expect(
      screen.getByRole('heading', { name: 'My teams' }).closest('[data-slot="card"]')
    ).toBeNull()
    await act(() => toggleTeamPin(homeTeam))
    await screen.findByRole('heading', { name: homeTeam.name })
    await act(() => toggleTeamPin(homeTeam))
    await waitFor(() => expect(screen.queryByRole('heading', { name: homeTeam.name })).toBeNull())
  })
  it('gives each team one upcoming and one previous result, including shared matches', async () => {
    const matches = [
      fixture(1),
      fixture(2, 5),
      { ...fixture(3), startingAt: Date.UTC(2026, 8, 25) },
      { ...fixture(4, 5), startingAt: Date.UTC(2026, 7, 20) }
    ]
    await seed(11, matches)
    await seed(22, matches)
    await toggleTeamPin(homeTeam)
    await toggleTeamPin(awayTeam)
    renderTeams()
    for (const team of [homeTeam, awayTeam]) {
      const heading = await screen.findByRole('heading', { name: team.name })
      const card = heading.closest('[data-slot="card"]')! as HTMLElement
      expect(within(card).getByRole('heading', { name: 'Upcoming' })).toBeTruthy()
      expect(within(card).getByRole('heading', { name: 'Previous result' })).toBeTruthy()
      const links = within(card)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('/fixtures/'))
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/fixtures/1?date=2026-09-08',
        '/fixtures/2?date=2026-09-08'
      ])
      expect(within(card).getByRole('link', { name: team.name }).getAttribute('href')).toBe(
        `/teams/${team.id}?date=2026-09-08`
      )
    }
  })
  it('hides a team with no qualifying games but retains a card with only a previous result', async () => {
    await seed(11, [])
    await seed(22, [fixture(2, 5)])
    await toggleTeamPin(homeTeam)
    await toggleTeamPin(awayTeam)
    renderTeams()
    await screen.findByRole('heading', { name: awayTeam.name })
    expect(screen.queryByRole('heading', { name: homeTeam.name })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Upcoming' })).toBeNull()
  })
  it('distinguishes uncached offline data from a completed empty query without an empty card', async () => {
    await toggleTeamPin(homeTeam)
    renderTeams()
    await screen.findByText('Northbridge United: Fixtures aren’t cached.')
    expect(screen.queryByRole('heading', { name: homeTeam.name })).toBeNull()
  })
})

async function seed(teamId: number, fixtures: CachedFixture[]): Promise<void> {
  const input = teamFixtureInput(teamId, '2026-08-09', 'UTC')
  await db.fixtures.bulkPut(fixtures)
  await db.teamFixtureQueries.put({
    ...input,
    key: teamFixtureQueryKey(input),
    fixtureIds: fixtures.map((fixture) => fixture.id),
    fetchedAt: Date.now(),
    staleAt: Date.now() + 60000,
    pageCount: 1
  })
}
function renderTeams(): void {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <YourTeams today="2026-09-08" timeZone="UTC" online={false} />
    }),
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
  render(<RouterProvider router={router} />)
}

function fixture(id: number, stateId = 1): CachedFixture {
  return {
    id,
    leagueId: 8,
    seasonId: 23614,
    stateId,
    startingAt: Date.UTC(2026, 8, 8, 18),
    name: `${homeTeam.name} v ${awayTeam.name}`,
    resultInfo: null,
    placeholder: false,
    hasOdds: false,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    raw: {
      id,
      league_id: 8,
      season_id: 23614,
      state_id: stateId,
      state:
        stateId === 3
          ? { id: 3, name: 'Half time', short_name: 'HT' }
          : { id: stateId, name: stateId === 5 ? 'Full time' : 'Not started' },
      placeholder: false,
      has_odds: false,
      league: { id: 8, name: 'Premier League' },
      participants: [
        { id: homeTeam.id, name: homeTeam.name, meta: { location: 'home' } },
        { id: awayTeam.id, name: awayTeam.name, meta: { location: 'away' } }
      ],
      scores: []
    },
    fetchedAt: 0,
    staleAt: 0
  }
}
