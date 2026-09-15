import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, Copy, LayoutTemplate, LoaderCircle, Plus, Save, Trash2, Undo2 } from 'lucide-react'
import {
  viewSpecSchema,
  type SavedView,
  type ViewBlock,
  type ViewContext,
  type ViewCountryContext,
  type ViewResearchContext,
  emptyViewResearchContext,
  type ViewTeamContext,
  type ViewSpec
} from '@shared/views'
import { db } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useOnline } from '@/lib/use-online'
import { useTvCountry } from '@/features/broadcasts/use-tv-country'
import { readViewBroadcastCountries, viewBroadcastCountries } from './view-broadcast-countries'
import {
  duplicateView,
  readViewContexts,
  readViewTeams,
  readSavedViews,
  viewContexts,
  saveView,
  undoSavedView
} from './saved-views'
import { ViewBlockContent, ViewBlockOutline } from './view-blocks'
import { ViewBlockContainer } from './view-block-container'
import { ViewBlockGrid } from './view-block-grid'
import { ViewComposer } from './view-composer'
import { useViewGeneration } from './use-view-generation'
import { StarterViewPicker } from './starter-view-picker'
import { ViewLayoutEditor } from './view-layout-editor'
import { PlayerStudyStarter } from './player-study-starter'
import { TeamViewStarter } from './team-view-starter'
import { readViewResearchContext, viewResearchContext } from './view-research-context'
import './views.css'

export function ViewsPage({ viewId }: { viewId?: string }): React.JSX.Element {
  const savedViews = useScopedLiveQuery(readSavedViews, [])
  const contexts = useScopedLiveQuery(readViewContexts, [])
  const teams = useScopedLiveQuery(readViewTeams, [])
  const countries = useScopedLiveQuery(readViewBroadcastCountries, [])
  const research = useScopedLiveQuery(readViewResearchContext, [])
  const navigate = useNavigate({ from: '/views' })
  const selected = savedViews?.find((view) => view.id === viewId)
  const onSelect = (id?: string): void => {
    void navigate({ search: { view: id } })
  }
  if (!savedViews || !contexts || !teams)
    return (
      <div role="status" className="p-8 text-sm text-muted-foreground">
        Opening your views…
      </div>
    )
  if (viewId && (!selected || !viewSpecSchema.safeParse(selected.spec).success))
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">View unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">This view could not be opened.</p>
        <Button className="mt-4" onClick={() => onSelect()}>
          Back to Views
        </Button>
      </div>
    )
  return (
    <ViewEditor
      key={viewId ?? 'new'}
      initial={selected ?? null}
      savedViews={savedViews}
      contexts={contexts}
      teams={teams}
      countries={countries ?? []}
      research={research ?? emptyViewResearchContext}
      onSelect={onSelect}
    />
  )
}

function ViewEditor({
  initial,
  savedViews,
  contexts: availableContexts,
  teams,
  countries,
  research,
  onSelect
}: {
  initial: SavedView | null
  savedViews: SavedView[]
  contexts: ViewContext[]
  teams: ViewTeamContext[]
  countries: ViewCountryContext[]
  research: ViewResearchContext
  onSelect: (id?: string) => void
}): React.JSX.Element {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID())
  const [spec, setSpec] = useState<ViewSpec | null>(initial?.spec ?? null)
  const contexts = viewContexts(availableContexts, spec?.blocks ?? [])
  const [previous, setPrevious] = useState<ViewSpec | null>(null)
  const [prompt, setPrompt] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [reset, setReset] = useState(0)
  const online = useOnline()
  const generation = useViewGeneration()
  const { country: preferredCountry } = useTvCountry()
  const saved = savedViews.find((view) => view.id === id)
  const dirty = Boolean(spec && JSON.stringify(spec) !== JSON.stringify(saved?.spec))
  useEffect(() => {
    let active = true
    void window.halfspace.views
      .getSettings()
      .then((result) => {
        if (!active) return
        if (result.ok) setConfigured(result.data.configured)
        else setStorageError(result.error.message)
      })
      .catch(() => {
        if (active) setStorageError('Could not read your AI settings. Open Settings to try again.')
      })
    return () => {
      active = false
    }
  }, [])

  async function build(): Promise<void> {
    if (!configured || !online || !prompt.trim() || saving) return
    setStorageError(null)
    const next = await generation.generate(
      prompt,
      contexts,
      spec,
      teams,
      viewBroadcastCountries(countries, preferredCountry, spec?.blocks ?? []),
      viewResearchContext(research, spec?.blocks ?? [])
    )
    if (!next) return
    setPrevious(spec)
    setSpec(next)
    setPrompt('')
  }

  async function save(): Promise<void> {
    if (!spec) return
    setSaving(true)
    setStorageError(null)
    try {
      await saveView(id, spec)
      if (!initial) onSelect(id)
    } catch {
      setStorageError('Could not save your view. Your draft is still open; please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function undo(): Promise<void> {
    if (previous) {
      setSpec(previous)
      setPrevious(null)
      return
    }
    if (dirty && saved) {
      setSpec(saved.spec)
      return
    }
    setSaving(true)
    try {
      const restored = await undoSavedView(id)
      if (restored) setSpec(restored)
    } catch {
      setStorageError('Could not restore the previous view.')
    } finally {
      setSaving(false)
    }
  }

  async function duplicate(): Promise<void> {
    if (!spec) return
    setSaving(true)
    setStorageError(null)
    try {
      const copy = await duplicateView(spec)
      onSelect(copy.id)
    } catch {
      setStorageError('Could not duplicate this view. Your draft is still open; please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setSaving(true)
    try {
      await db.savedViews.delete(id)
      onSelect()
    } catch {
      setStorageError('Could not delete this view. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function changeBlock(block: ViewBlock): void {
    if (!spec) return
    changeSpec({
      ...spec,
      blocks: spec.blocks.map((item) => (item.id === block.id ? block : item))
    })
  }

  function changeSpec(next: ViewSpec): void {
    setPrevious(spec)
    setSpec(next)
  }

  function newView(): void {
    generation.cancel()
    if (initial) {
      onSelect()
      return
    }
    setSpec(null)
    setPrevious(null)
    setPrompt('')
    setStorageError(null)
    setReset((value) => value + 1)
  }

  const blocks = generation.generating ? generation.blocks : (spec?.blocks ?? [])

  const savedViewOptions = [
    { value: '', label: 'New view' },
    ...savedViews.map((view) => ({ value: String(view.id), label: view.spec.title }))
  ]
  return (
    <div
      className="view-workspace @container/view-workspace relative isolate flex h-full min-h-[500px] flex-col bg-background"
      key={reset}
    >
      <header className="flex min-h-[62px] flex-none items-center justify-between gap-3 bg-background px-6 py-3 @max-[740px]/view-workspace:px-4 @max-[740px]/view-workspace:py-2.5 @max-[740px]/view-workspace:flex-wrap">
        <div className="flex min-w-0 items-center gap-3">
          <LayoutTemplate className="size-4 text-primary" />
          <h1 className="text-sm font-semibold">Views</h1>
          {savedViews.length > 0 && (
            <Select
              items={savedViewOptions}
              value={String(initial?.id ?? '')}
              onValueChange={(value) => {
                if (value === null) return
                onSelect(value || undefined)
              }}
            >
              <SelectTrigger aria-label="Saved views" className="max-w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {savedViewOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {spec && (
            <>
              <ViewLayoutEditor
                spec={spec}
                contexts={contexts}
                teams={teams}
                disabled={saving || generation.generating}
                onChange={changeSpec}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Undo change"
                disabled={
                  saving ||
                  generation.generating ||
                  !(previous || saved?.previousSpec || (dirty && saved))
                }
                onClick={() => void undo()}
              >
                <Undo2 className="size-4" />
              </Button>
              <span className="mr-2 hidden items-center gap-1.5 text-xs text-muted-foreground @min-[740px]/view-workspace:flex">
                {dirty ? (
                  'Unsaved changes'
                ) : (
                  <>
                    <Check className="size-3" />
                    Saved locally
                  </>
                )}
              </span>
              <Button
                size="sm"
                disabled={!dirty || saving || generation.generating}
                onClick={() => void save()}
              >
                <Save className="size-3.5" />
                {saving ? 'Saving…' : 'Save view'}
              </Button>
            </>
          )}
          {initial && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete view"
              disabled={saving || generation.generating}
              onClick={() => void remove()}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          {spec && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Duplicate view"
              title="Duplicate view"
              disabled={saving || generation.generating}
              onClick={() => void duplicate()}
            >
              <Copy className="size-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={newView} disabled={saving}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      </header>

      <div className="view-canvas flex min-h-0 flex-1 flex-col overflow-auto">
        {!spec && !generation.generating ? (
          <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 @min-[900px]/view-workspace:px-10 @min-[900px]/view-workspace:py-20">
            <div className="mb-8 max-w-xl space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">Your football, your view.</h2>
              <p className="text-base text-muted-foreground">
                Start with a team, a competition or a player comparison. Make it yours as you go.
              </p>
            </div>
            <div className="grid gap-4 @min-[800px]/view-workspace:grid-cols-3">
              <TeamViewStarter
                teams={teams}
                contexts={contexts}
                onCreate={(next) => {
                  setSpec(next)
                  setStorageError(null)
                }}
              />
              <StarterViewPicker
                contexts={contexts}
                onCreate={(next) => {
                  setSpec(next)
                  setStorageError(null)
                }}
              />
              <PlayerStudyStarter
                onCreate={(next) => {
                  setSpec(next)
                  setStorageError(null)
                }}
              />
            </div>
          </div>
        ) : (
          <div className="view-sheet @container/view-sheet mx-auto w-full max-w-[1480px] flex-none px-8 pt-9 pb-12 @max-[740px]/view-workspace:px-5 @max-[740px]/view-workspace:pt-6.5 @max-[740px]/view-workspace:pb-9">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                {generation.generating ? (
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {spec ? 'Reshaping your view' : 'A view taking shape'}
                  </h2>
                ) : (
                  <>
                    <Label className="sr-only" htmlFor="view-title">
                      View name
                    </Label>
                    <Input
                      id="view-title"
                      className="h-auto rounded-none border-0 border-b border-transparent px-0 py-0.5 text-[26px] font-semibold tracking-tight focus-visible:border-ring focus-visible:ring-0 md:text-[26px]"
                      maxLength={80}
                      value={spec?.title ?? ''}
                      onChange={(event) => {
                        if (spec) setSpec({ ...spec, title: event.target.value })
                      }}
                    />
                  </>
                )}
              </div>
              {generation.generating && (
                <LoaderCircle
                  className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
                  aria-hidden
                />
              )}
            </div>
            <ViewBlockGrid blocks={blocks} generating={generation.generating}>
              {blocks.map((block) => (
                <ViewBlockContainer
                  key={`${generation.generating ? 'draft' : 'view'}:${block.id}`}
                  block={block}
                  defer={!generation.generating}
                >
                  {generation.generating ? (
                    <ViewBlockOutline block={block} />
                  ) : (
                    <ViewBlockContent block={block} blocks={blocks} onChange={changeBlock} />
                  )}
                </ViewBlockContainer>
              ))}
              {generation.generating && blocks.length === 0 && (
                <div className="col-span-full flex min-h-60 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
                  <LoaderCircle
                    className="size-5 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                  <p>Finding the shape of your view</p>
                </div>
              )}
            </ViewBlockGrid>
          </div>
        )}

        <ViewComposer
          prompt={prompt}
          onPromptChange={setPrompt}
          generating={generation.generating}
          placed={blocks.length}
          hasView={Boolean(spec)}
          configured={configured}
          online={online}
          error={storageError ?? generation.error}
          onSubmit={() => void build()}
          onCancel={generation.cancel}
        />
      </div>
    </div>
  )
}
