import { ViewContextSelect } from './view-context-select'
import { useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import type { ViewContext, ViewSpec } from '@shared/views'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createResearchView, createStarterView, starterViews } from './starter-views'

export function StarterViewPicker({
  contexts,
  onCreate
}: {
  contexts: ViewContext[]
  onCreate: (spec: ViewSpec) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState('')
  const [open, setOpen] = useState(false)
  const context =
    contexts.find((item) => `${item.competitionId}:${item.seasonId}` === selected) ??
    contexts.find((item) => item.isCurrent) ??
    contexts[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card className="h-full">
        <CardHeader className="gap-3">
          <ChartNoAxesCombined className="size-5 text-primary" aria-hidden />
          <CardTitle>Match research</CardTitle>
          <CardDescription>
            Find upcoming matches across competitions and compare prices.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={() => onCreate(createResearchView())}>
            Research matches
          </Button>
          {context && (
            <DialogTrigger render={<Button variant="ghost" />}>More starting points</DialogTrigger>
          )}
        </CardContent>
      </Card>
      {context && (
        <DialogContent
          className="max-h-[85dvh] gap-6 overflow-y-auto p-6"
          aria-describedby="competition-starter-description"
        >
          <div className="space-y-2">
            <DialogTitle>Explore a competition</DialogTitle>
            <p id="competition-starter-description" className="text-sm text-muted-foreground">
              Choose a season and a starting point.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="starter-context">Competition and season</Label>
            <ViewContextSelect
              id="starter-context"
              className="w-full"
              value={`${context.competitionId}:${context.seasonId}`}
              onValueChange={(value) => setSelected(value)}
              contexts={contexts}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {starterViews
              .filter((template) => template.id !== 'research')
              .map((template) => (
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
        </DialogContent>
      )}
    </Dialog>
  )
}
