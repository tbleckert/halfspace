import { ViewContextSelect } from './view-context-select'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { ViewContext, ViewSpec } from '@shared/views'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createStarterView, starterViews } from './starter-views'

export function StarterViewPicker({
  contexts,
  onCreate
}: {
  contexts: ViewContext[]
  onCreate: (spec: ViewSpec) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState('')
  const context =
    contexts.find((item) => `${item.competitionId}:${item.seasonId}` === selected) ??
    contexts.find((item) => item.isCurrent) ??
    contexts[0]

  if (!context)
    return (
      <Link to="/competitions" className="mt-6 text-sm text-primary hover:underline">
        Open a competition to make its seasons available
      </Link>
    )

  return (
    <div className="mt-6 w-full max-w-2xl space-y-4">
      <div className="mx-auto flex w-fit max-w-full flex-col gap-2">
        <Label htmlFor="starter-context">Competition and season</Label>
        <ViewContextSelect
          id="starter-context"
          className="max-w-full"
          value={`${context.competitionId}:${context.seasonId}`}
          onChange={(event) => setSelected(event.target.value)}
          contexts={contexts}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {starterViews.map((template) => (
          <Button
            key={template.id}
            variant="ghost"
            className="h-auto flex-col items-start whitespace-normal bg-card p-4 text-left"
            onClick={() => onCreate(createStarterView(template.id, context))}
          >
            <span>{template.title}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {template.description}
            </span>
          </Button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Start with a view, or describe one below. AI is optional.
      </p>
    </div>
  )
}
