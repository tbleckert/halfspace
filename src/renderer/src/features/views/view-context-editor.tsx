import { useState } from 'react'
import type { ViewContext, ViewSpec } from '@shared/views'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { changeViewContext } from './view-editing'

export function ViewContextEditor({
  spec,
  contexts,
  disabled,
  onChange
}: {
  spec: ViewSpec
  contexts: ViewContext[]
  disabled: boolean
  onChange: (spec: ViewSpec) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const context = contexts.find((item) => `${item.competitionId}:${item.seasonId}` === selected)
  const unchanged =
    context &&
    spec.blocks.every(
      (block) =>
        block.competitionId === context.competitionId && block.seasonId === context.seasonId
    )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setSelected('')
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !contexts.length}
            aria-label="Change competition or season"
          />
        }
      >
        Competition &amp; season
      </DialogTrigger>
      <DialogContent className="p-5" aria-describedby="view-context-description">
        <DialogTitle>Change competition or season</DialogTitle>
        <p id="view-context-description" className="mt-2 text-sm text-muted-foreground">
          Apply the selection to every block in this view. You can undo the change before saving.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!context || disabled || unchanged) return
            onChange(changeViewContext(spec, context, contexts))
            setOpen(false)
            setSelected('')
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="view-context">New competition and season</Label>
            <NativeSelect
              id="view-context"
              className="w-full"
              value={selected}
              disabled={disabled}
              onChange={(event) => setSelected(event.target.value)}
            >
              <NativeSelectOption value="">Choose competition and season</NativeSelectOption>
              {contexts.map((item) => (
                <NativeSelectOption
                  key={`${item.competitionId}:${item.seasonId}`}
                  value={`${item.competitionId}:${item.seasonId}`}
                >
                  {item.competitionName} · {item.seasonName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled || !context || unchanged}>
              Apply to all blocks
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
