import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowUpRight, Check, Copy, LayoutTemplate, Plus, Save, Trash2, Undo2 } from 'lucide-react'
import {
  viewSpecSchema,
  type SavedView,
  type ViewBlock,
  type ViewContext,
  type ViewSpec
} from '@shared/views'
import { db } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useOnline } from '@/lib/use-online'
import { cn } from '@/lib/utils'
import { duplicateView, readViewContexts, saveView, undoSavedView } from './saved-views'
import { ViewBlockContent, ViewBlockOutline } from './view-blocks'
import { ViewComposer } from './view-composer'
import { useViewGeneration } from './use-view-generation'
import { StarterViewPicker } from './starter-view-picker'
import { ViewLayoutEditor } from './view-layout-editor'
import { ViewContextEditor } from './view-context-editor'
import './views.css'

export function ViewsPage({ viewId }: { viewId?: string }): React.JSX.Element {
  const savedViews = useScopedLiveQuery(
    () => db.savedViews.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const contexts = useScopedLiveQuery(readViewContexts, [])
  const navigate = useNavigate({ from: '/views' })
  const selected = savedViews?.find((view) => view.id === viewId)
  const onSelect = (id?: string): void => {
    void navigate({ search: { view: id } })
  }
  if (!savedViews || !contexts)
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
      onSelect={onSelect}
    />
  )
}

function ViewEditor({
  initial,
  savedViews,
  contexts,
  onSelect
}: {
  initial: SavedView | null
  savedViews: SavedView[]
  contexts: ViewContext[]
  onSelect: (id?: string) => void
}): React.JSX.Element {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID())
  const [spec, setSpec] = useState<ViewSpec | null>(initial?.spec ?? null)
  const [previous, setPrevious] = useState<ViewSpec | null>(null)
  const [prompt, setPrompt] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [reset, setReset] = useState(0)
  const online = useOnline()
  const generation = useViewGeneration()
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
    if (!configured || !online || !contexts.length || !prompt.trim() || saving) return
    setStorageError(null)
    const next = await generation.generate(prompt, contexts, spec)
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

  return (
    <div className="view-workspace" key={reset}>
      <header className="view-toolbar">
        <div className="flex min-w-0 items-center gap-3">
          <LayoutTemplate className="size-4 text-primary" />
          <h1 className="text-sm font-semibold">Views</h1>
          {savedViews.length > 0 && (
            <NativeSelect
              aria-label="Saved views"
              className="max-w-52"
              value={initial?.id ?? ''}
              onChange={(event) => onSelect(event.target.value || undefined)}
            >
              <NativeSelectOption value="">New view</NativeSelectOption>
              {savedViews.map((view) => (
                <NativeSelectOption key={view.id} value={view.id}>
                  {view.spec.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {spec && (
            <>
              <ViewLayoutEditor
                spec={spec}
                contexts={contexts}
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
              <span className="mr-2 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
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

      <div className="view-canvas">
        {!spec && !generation.generating ? (
          <div className="view-empty">
            <CanvasIllustration />
            <h2>Your football, your view.</h2>
            <p>Bring fixtures, standings and player leaders into one view.</p>
            <StarterViewPicker
              contexts={contexts}
              onCreate={(next) => {
                setSpec(next)
                setStorageError(null)
              }}
            />
          </div>
        ) : (
          <div className="view-sheet">
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
                      className="h-auto rounded-none border-0 border-b border-transparent px-0 py-0.5 text-[26px] font-semibold tracking-tight focus-visible:border-ring focus-visible:ring-0"
                      maxLength={80}
                      value={spec?.title ?? ''}
                      onChange={(event) => {
                        if (spec) setSpec({ ...spec, title: event.target.value })
                      }}
                    />
                    <p className="mt-2 text-sm text-muted-foreground">{spec?.message}</p>
                    {spec && (
                      <div className="mt-3">
                        <ViewContextEditor
                          spec={spec}
                          contexts={contexts}
                          disabled={saving || generation.generating}
                          onChange={changeSpec}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              {generation.generating && <span className="view-drawing-mark" aria-hidden="true" />}
            </div>
            <div
              className="view-block-grid"
              aria-label="View canvas"
              aria-busy={generation.generating}
            >
              {blocks.map((block) => (
                <div
                  key={`${generation.generating ? 'draft' : 'view'}:${block.id}:${block.competitionId}:${block.seasonId}`}
                  className={cn('view-block', block.span === 'full' && 'view-block-full')}
                >
                  {generation.generating ? (
                    <ViewBlockOutline block={block} />
                  ) : (
                    <ViewBlockContent block={block} onChange={changeBlock} />
                  )}
                </div>
              ))}
              {generation.generating && blocks.length === 0 && (
                <div className="view-awaiting">
                  <div className="view-planning-lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>Finding the shape of your view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ViewComposer
        prompt={prompt}
        onPromptChange={setPrompt}
        generating={generation.generating}
        placed={blocks.length}
        hasView={Boolean(spec)}
        configured={configured}
        online={online}
        hasContexts={contexts.length > 0}
        error={storageError ?? generation.error}
        onSubmit={() => void build()}
        onCancel={generation.cancel}
      />
    </div>
  )
}

function CanvasIllustration(): React.JSX.Element {
  return (
    <div className="view-illustration" aria-hidden="true">
      <div className="view-illustration-guide" />
      <div className="view-mini-card view-mini-fixtures">
        <span>Fixtures</span>
        <i />
        <i />
        <i />
      </div>
      <div className="view-mini-card view-mini-table">
        <span>Table</span>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="view-mini-card view-mini-leaders">
        <span>Player leaders</span>
        <div>
          <b />
          <b />
          <b />
        </div>
      </div>
      <span className="view-cursor">
        <ArrowUpRight className="size-4" />
      </span>
    </div>
  )
}
