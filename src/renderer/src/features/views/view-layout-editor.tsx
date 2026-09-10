import { ViewContextSelect } from './view-context-select'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { ViewContext, ViewSpec } from '@shared/views'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  addViewBlock,
  moveViewBlock,
  removeViewBlock,
  viewBlockLabel,
  viewBlockTypes,
  type ViewBlockType
} from './view-editing'

export function ViewLayoutEditor({
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
  const [type, setType] = useState<ViewBlockType>('standings')
  const [contextKey, setContextKey] = useState('')
  const first = spec.blocks[0]
  const context =
    contexts.find((item) => `${item.competitionId}:${item.seasonId}` === contextKey) ??
    contexts.find(
      (item) => item.competitionId === first?.competitionId && item.seasonId === first?.seasonId
    ) ??
    contexts[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={disabled} />}>
        Edit blocks
      </DialogTrigger>
      <DialogContent className="max-h-[76vh] overflow-y-auto p-5" aria-describedby={undefined}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <DialogTitle>Edit blocks</DialogTitle>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
        <ol className="space-y-3">
          {spec.blocks.map((block, index) => (
            <li key={block.id}>
              <Card className="space-y-2 p-3">
                <p className="text-sm font-medium">{viewBlockLabel(block)}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <NativeSelect
                    size="sm"
                    aria-label={`Width of block ${index + 1}`}
                    value={block.span}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) =>
                          item.id === block.id
                            ? { ...item, span: event.target.value as 'half' | 'full' }
                            : item
                        )
                      })
                    }
                  >
                    <NativeSelectOption value="half">Half width</NativeSelectOption>
                    <NativeSelectOption value="full">Full width</NativeSelectOption>
                  </NativeSelect>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={disabled || index === 0}
                    aria-label={`Move block ${index + 1} up`}
                    onClick={() => onChange(moveViewBlock(spec, block.id, -1))}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={disabled || index === spec.blocks.length - 1}
                    aria-label={`Move block ${index + 1} down`}
                    onClick={() => onChange(moveViewBlock(spec, block.id, 1))}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={disabled || spec.blocks.length === 1}
                    aria-label={`Remove block ${index + 1}`}
                    onClick={() => onChange(removeViewBlock(spec, block.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ol>
        {context ? (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              onChange(addViewBlock(spec, type, context))
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="block-type">New block</Label>
              <NativeSelect
                id="block-type"
                value={type}
                disabled={disabled}
                onChange={(event) => setType(event.target.value as ViewBlockType)}
              >
                {viewBlockTypes.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-context">Competition and season for new block</Label>
              <ViewContextSelect
                id="block-context"
                className="max-w-full"
                value={`${context.competitionId}:${context.seasonId}`}
                disabled={disabled}
                onChange={(event) => setContextKey(event.target.value)}
                contexts={contexts}
              />
            </div>
            <Button type="submit" disabled={disabled || spec.blocks.length >= 8}>
              <Plus className="size-4" />
              Add block
            </Button>
            {spec.blocks.length >= 8 && (
              <p className="text-xs text-muted-foreground">
                A view can contain up to eight blocks.
              </p>
            )}
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Open a competition to make more blocks available.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
