import { writeTeamSeasons } from '@/data/discovery-cache'
import { afterAll, beforeEach, expect, it } from 'vitest'
import { clearSportmonksCache, db, writeCompetitionRefresh } from '@/data/db'
import {
  duplicateView,
  readSavedViews,
  readViewContexts,
  viewContexts,
  saveView,
  undoSavedView
} from './saved-views'
import { viewContextSchema, type ViewSpec } from '@shared/views'

const spec: ViewSpec = {
  version: 3,
  title: 'My league',
  message: '',
  blocks: [
    { id: 'table', type: 'standings', teamId: null, competitionId: 8, seasonId: 12, span: 1 }
  ]
}
beforeEach(async () => {
  await db.savedViews.clear()
})
afterAll(() => db.close())

it('preserves saved definitions when Sportmonks data is reset', async () => {
  await saveView('my-view', spec)
  await clearSportmonksCache()
  expect((await db.savedViews.get('my-view'))?.spec).toEqual(spec)
})

it('opens and edits a persisted v1 view and restores it through undo in the new format', async () => {
  const legacy = {
    version: 1,
    title: 'Old view',
    message: '',
    blocks: [{ id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'full' }]
  }
  await db.savedViews.put({
    id: 'legacy',
    spec: legacy as unknown as ViewSpec,
    previousSpec: null,
    createdAt: 1,
    updatedAt: 2
  })
  const [opened] = await readSavedViews()
  expect(opened.spec).toMatchObject({
    version: 3,
    blocks: [{ id: 'table', span: 3, teamId: null }]
  })
  await saveView('legacy', { ...opened.spec, title: 'Edited' })
  expect((await db.savedViews.get('legacy'))?.createdAt).toBe(1)
  expect(await undoSavedView('legacy')).toEqual(opened.spec)
  expect((await readSavedViews())[0].spec).toEqual(opened.spec)
})

it('keeps the previous saved definition for undo and preserves creation time', async () => {
  const original = await saveView('my-view', spec)
  await saveView('my-view', { ...spec, title: 'Updated' })
  expect((await db.savedViews.get('my-view'))?.createdAt).toBe(original.createdAt)
  await undoSavedView('my-view')
  expect((await db.savedViews.get('my-view'))?.spec).toEqual(spec)
})

it('refuses to persist an incomplete definition', async () => {
  await expect(saveView('my-view', { ...spec, blocks: [] })).rejects.toThrow()
  expect(await db.savedViews.count()).toBe(0)
})

it('duplicates the current draft into an independent saved view without changing its source', async () => {
  await saveView('original', spec)
  const copy = await duplicateView({
    ...spec,
    title: 'Current draft',
    blocks: [{ ...spec.blocks[0], span: 3 }]
  })
  expect(copy.id).not.toBe('original')
  expect(copy.spec.title).toBe('Current draft copy')
  expect(copy.spec.blocks[0].span).toBe(3)
  expect(copy.previousSpec).toBeNull()
  expect((await db.savedViews.get('original'))?.spec).toEqual(spec)
  await db.savedViews.delete('original')
  await clearSportmonksCache()
  expect((await db.savedViews.get(copy.id))?.spec).toEqual(copy.spec)
})

it('keeps copied names within the saved format and refuses empty drafts', async () => {
  expect((await duplicateView({ ...spec, title: 'A'.repeat(80) })).spec.title).toHaveLength(80)
  await expect(duplicateView({ ...spec, blocks: [] })).rejects.toThrow()
  expect(await db.savedViews.count()).toBe(1)
})

it('sends reported competition types with season context and leaves missing types unknown', async () => {
  await clearSportmonksCache()
  await writeCompetitionRefresh({
    competitions: [
      { id: 8, country_id: 1, name: 'Example league', active: true, type: 'league' },
      { id: 9, country_id: 1, name: 'Example cup', active: true, type: 'cup' },
      { id: 10, country_id: 1, name: 'Unclassified competition', active: true }
    ].map((competition) => ({
      ...competition,
      currentseason: {
        id: competition.id + 100,
        league_id: competition.id,
        name: '2026/27',
        is_current: true
      }
    })),
    fetchedAt: Date.now(),
    pageCount: 1
  })
  const contexts = await readViewContexts()
  expect(contexts.map((context) => viewContextSchema.parse(context))).toEqual([
    expect.objectContaining({ competitionId: 8, seasonId: 108, competitionType: 'league' }),
    expect.objectContaining({ competitionId: 9, seasonId: 109, competitionType: 'cup' }),
    expect.objectContaining({ competitionId: 10, seasonId: 110, competitionType: null })
  ])
})

it('retains explicitly requested historical seasons beyond the recent-season picker and identity limit', async () => {
  await clearSportmonksCache()
  const seasons = Array.from({ length: 260 }, (_, i) => ({
    id: i + 100,
    league_id: 384,
    name: `${2026 - i}/${2027 - i}`,
    is_current: i === 0
  }))
  await writeTeamSeasons(
    { teamId: 625 },
    {
      teamId: 625,
      fetchedAt: Date.now(),
      seasons: seasons.map((season) => ({
        ...season,
        league: { id: 384, name: 'Serie A', country_id: 1, active: true }
      }))
    }
  )
  const contexts = viewContexts(
    await readViewContexts('My favorite Juventus season is 2015/16'),
    []
  )
  expect(contexts).toHaveLength(250)
  expect(contexts[0]).toMatchObject({
    seasonName: '2015/2016',
    competitionId: 384,
    isCurrent: false
  })
  expect(contexts[1]).toMatchObject({ isCurrent: true })
  expect(
    viewContexts(await readViewContexts(), [
      {
        id: 'results',
        type: 'team-season-results',
        teamId: 625,
        competitionId: 384,
        seasonId: 111,
        span: 2
      }
    ])[0]
  ).toMatchObject({ seasonName: '2015/2016', competitionName: 'Serie A' })
})

it('keeps a saved historical scope editable after its cached metadata is cleared', async () => {
  const historical: ViewSpec = {
    version: 3,
    title: 'Juventus 2015/16',
    message: '',
    blocks: [
      {
        id: 'results',
        type: 'team-season-results',
        teamId: 625,
        competitionId: 384,
        seasonId: 15,
        span: 2
      }
    ]
  }
  await saveView('history', historical)
  await clearSportmonksCache()
  const saved = (await readSavedViews()).find((view) => view.id === 'history')!
  const contexts = viewContexts(await readViewContexts(), saved.spec.blocks)
  expect(contexts).toEqual([
    {
      competitionId: 384,
      competitionName: 'Competition 384',
      seasonId: 15,
      seasonName: 'Season 15',
      isCurrent: false
    }
  ])
  expect(saved.spec).toEqual(historical)
})
