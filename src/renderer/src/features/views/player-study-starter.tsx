import { useState } from 'react'
import { validateViewSpec, type ViewSpec, type ViewStatisticContext } from '@shared/views'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { db } from '@/data/db'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { ViewStatisticPicker } from './view-statistic-picker'
import { playerViewSelection } from './view-research-context'

export function PlayerStudyStarter({
  onCreate
}: {
  onCreate: (spec: ViewSpec) => void
}): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState<ViewStatisticContext | null>(null)
  const [right, setRight] = useState<ViewStatisticContext | null>(null)
  const count = useScopedLiveQuery(() => db.players.count(), [])
  if (!count) return null
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Create a player study</DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[80vh] space-y-5 overflow-y-auto p-5"
      >
        <div className="space-y-1">
          <DialogTitle>Compare two players</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose the club and season for each player.
          </p>
        </div>
        <ViewStatisticPicker
          kind="players"
          label="First sample"
          selection={left ? playerViewSelection(left) : undefined}
          onSelect={setLeft}
          onPending={() => setLeft(null)}
        />
        <ViewStatisticPicker
          kind="players"
          label="Second sample"
          selection={right ? playerViewSelection(right) : undefined}
          onSelect={setRight}
          onPending={() => setRight(null)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!left || !right}
            onClick={() => {
              if (!left || !right) return
              const first = playerViewSelection(left)
              const second = playerViewSelection(right)
              onCreate(
                validateViewSpec(
                  {
                    version: 3,
                    title: `${left.entityName} & ${right.entityName}`.slice(0, 80),
                    message: '',
                    blocks: [
                      { id: 'first-player', type: 'player-profile', selection: first, span: 1 },
                      { id: 'second-player', type: 'player-profile', selection: second, span: 2 },
                      {
                        id: 'comparison',
                        type: 'player-comparison',
                        left: first,
                        right: second,
                        span: 3
                      }
                    ]
                  },
                  [],
                  [],
                  [],
                  { fixtures: [], statistics: [left, right], markets: [], bookmakers: [] }
                )
              )
              setOpen(false)
            }}
          >
            Create player study
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
