import { useState } from 'react'
import { Bookmark, Save, Trash2 } from 'lucide-react'
import { savedComparisonSchema, type ComparisonSelection } from '@shared/comparisons'
import { db } from '@/data/db'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ErrorAlert } from '@/components/error-alert'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { saveComparison } from './saved-comparisons'

export function SavedComparisonControls({
  selection,
  onOpen
}: {
  selection: ComparisonSelection | null
  onOpen: (selection: ComparisonSelection) => void
}): React.JSX.Element {
  const saved = useScopedLiveQuery(
    () => db.savedComparisons.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function save(): Promise<void> {
    if (!selection) return
    setBusy(true)
    setError(null)
    try {
      await saveComparison(name, selection)
      setNotice('Comparison saved locally')
      setOpen(false)
      setName('')
    } catch {
      setError('Could not save this comparison. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await db.savedComparisons.delete(id)
    } catch {
      setError('Could not delete this comparison. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {notice && (
        <span role="status" className="text-xs text-muted-foreground">
          {notice}
        </span>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) {
            setOpen(next)
            setError(null)
          }
        }}
      >
        <DialogTrigger render={<Button disabled={!selection} />}>
          <Save className="size-4" />
          Save comparison
        </DialogTrigger>
        <DialogTrigger render={<Button variant="outline" />}>
          <Bookmark className="size-4" />
          Saved comparisons
        </DialogTrigger>
        <DialogContent className="max-h-[76vh] overflow-y-auto p-5" aria-describedby={undefined}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <DialogTitle>Saved comparisons</DialogTitle>
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          {error && <ErrorAlert>{error}</ErrorAlert>}
          {selection && (
            <form
              className="mb-5 space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                void save()
              }}
            >
              <Label htmlFor="comparison-name">Comparison name</Label>
              <div className="flex gap-2">
                <Input
                  id="comparison-name"
                  value={name}
                  maxLength={80}
                  required
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name this comparison"
                  disabled={busy}
                />
                <Button type="submit" disabled={busy || !name.trim()}>
                  <Save className="size-4" />
                  Save
                </Button>
              </div>
            </form>
          )}
          <div className="space-y-2">
            {saved?.map((record) => {
              const valid = savedComparisonSchema.safeParse(record)
              return (
                <Card key={record.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{record.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {valid.success
                        ? record.selection.kind === 'teams'
                          ? 'Team comparison'
                          : 'Player comparison'
                        : 'Comparison unavailable'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || !valid.success}
                    aria-label={`Open ${record.name}`}
                    onClick={() => {
                      if (valid.success) {
                        onOpen(valid.data.selection)
                        setOpen(false)
                        setNotice(null)
                      }
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Delete ${record.name}`}
                    onClick={() => void remove(record.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </Card>
              )
            })}
            {!saved?.length && (
              <p role="status" className="py-4 text-sm text-muted-foreground">
                {saved ? 'No saved comparisons yet.' : 'Loading saved comparisons…'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
