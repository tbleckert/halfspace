import { db } from '@/data/db'
import { competitionSeasonOptions } from '@/features/competitions/competition-workspace-data'
import {
  readStoredViewSpec,
  viewSpecSchema,
  type SavedView,
  type ViewContext,
  type ViewSpec,
  type ViewTeamContext
} from '@shared/views'

export async function readSavedViews(): Promise<SavedView[]> {
  const views = await db.savedViews.orderBy('updatedAt').reverse().toArray()
  return views.map((view) => {
    try {
      return {
        ...view,
        spec: readStoredViewSpec(view.spec),
        previousSpec: view.previousSpec ? readStoredViewSpec(view.previousSpec) : null
      }
    } catch {
      // Keep an unreadable record visible so the existing unavailable-view state can explain it.
      return view
    }
  })
}

export async function saveView(id: string, value: ViewSpec): Promise<SavedView> {
  const spec = viewSpecSchema.parse(value)
  if (!spec.blocks.length) throw new Error('Build a view before saving it.')
  return db.transaction('rw', db.savedViews, async () => {
    const existing = await db.savedViews.get(id)
    const now = Date.now()
    const saved = {
      id,
      spec,
      previousSpec: existing ? readStoredViewSpec(existing.spec) : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    await db.savedViews.put(saved)
    return saved
  })
}

export async function duplicateView(spec: ViewSpec): Promise<SavedView> {
  return saveView(crypto.randomUUID(), {
    ...spec,
    title: `${spec.title.trim().slice(0, 75).trimEnd()} copy`
  })
}

export async function undoSavedView(id: string): Promise<ViewSpec | null> {
  return db.transaction('rw', db.savedViews, async () => {
    const saved = await db.savedViews.get(id)
    if (!saved?.previousSpec) return null
    const restored = readStoredViewSpec(saved.previousSpec)
    await db.savedViews.put({
      ...saved,
      spec: restored,
      previousSpec: null,
      updatedAt: Date.now()
    })
    return restored
  })
}

export async function readViewTeams(): Promise<ViewTeamContext[]> {
  const [teams, pins, memberships, competitions] = await Promise.all([
    db.teams.orderBy('name').toArray(),
    db.teamPins.orderBy('pinnedAt').toArray(),
    db.teamCompetitionQueries.toArray(),
    db.competitions.toArray()
  ])
  const identities = [
    ...new Map([
      ...pins.map(
        (team) =>
          [
            team.teamId,
            {
              teamId: team.teamId,
              teamName: teams.find((item) => item.id === team.teamId)?.name ?? team.name
            }
          ] as const
      ),
      ...teams
        .filter((team) => !pins.some((pin) => pin.teamId === team.id))
        .map((team) => [team.id, { teamId: team.id, teamName: team.name }] as const)
    ]).values()
  ].slice(0, 250)
  return identities.map((team) => ({
    ...team,
    currentSeasons: (
      memberships.find((membership) => membership.teamId === team.teamId)?.competitionIds ?? []
    ).flatMap((id) => {
      const season = competitions.find((competition) => competition.id === id)?.raw.currentseason
      return season?.is_current && season.league_id === id
        ? [{ competitionId: id, seasonId: season.id }]
        : []
    })
  }))
}

export async function readViewContexts(): Promise<ViewContext[]> {
  const [competitions, seasonQueries] = await Promise.all([
    db.competitions.orderBy('id').toArray(),
    db.competitionSeasonQueries.toArray()
  ])
  return competitions
    .flatMap((competition) => {
      const seasons = competitionSeasonOptions(
        seasonQueries.find((query) => query.competitionId === competition.id)?.seasons ?? [],
        competition.raw.currentseason
      )
      return seasons
        .filter((season) => season.league_id === competition.id)
        .map((season) => ({
          competitionId: competition.id,
          competitionName: competition.name,
          seasonId: season.id,
          seasonName: season.name,
          isCurrent: season.is_current
        }))
    })
    .slice(0, 250)
}
