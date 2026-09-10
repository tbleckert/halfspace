import { db } from '@/data/db'
import { competitionSeasonOptions } from '@/features/competitions/competition-workspace-data'
import { viewSpecSchema, type SavedView, type ViewContext, type ViewSpec } from '@shared/views'

export async function saveView(id: string, value: ViewSpec): Promise<SavedView> {
  const spec = viewSpecSchema.parse(value)
  if (!spec.blocks.length) throw new Error('Build a view before saving it.')
  return db.transaction('rw', db.savedViews, async () => {
    const existing = await db.savedViews.get(id)
    const now = Date.now()
    const saved = {
      id,
      spec,
      previousSpec: existing?.spec ?? null,
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
    await db.savedViews.put({
      ...saved,
      spec: saved.previousSpec,
      previousSpec: null,
      updatedAt: Date.now()
    })
    return saved.previousSpec
  })
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
