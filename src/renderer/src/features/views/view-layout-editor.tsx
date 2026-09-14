import { ViewContextSelect } from './view-context-select'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { ViewContext, ViewSpec, ViewTeamContext, ViewStatisticContext } from '@shared/views'
import { viewWidget, widgetColumns, type WidgetColumns } from '@shared/view-widgets'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ViewStatisticPicker } from './view-statistic-picker'
import { playerViewSelection, teamViewSelection } from './view-research-context'
import { ViewTeamSelect } from './view-team-select'
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
  teams,
  disabled,
  onChange
}: {
  spec: ViewSpec
  contexts: ViewContext[]
  teams: ViewTeamContext[]
  disabled: boolean
  onChange: (spec: ViewSpec) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ViewBlockType>('standings')
  const [contextKey, setContextKey] = useState('')
  const [teamId, setTeamId] = useState<number | null>(null)
  const [left, setLeft] = useState<ViewStatisticContext | null>(null)
  const [right, setRight] = useState<ViewStatisticContext | null>(null)
  const [nextMatchBlockId, setNextMatchBlockId] = useState('')
  const sources = spec.blocks.filter((block) => block.type === 'team-next-match')
  const source = sources.find((block) => block.id === nextMatchBlockId) ?? sources[0]
  const sourceOptions = sources.map((block) => (
    <NativeSelectOption key={block.id} value={block.id}>
      Next match ·{' '}
      {teams.find((team) => team.teamId === block.teamId)?.teamName ?? `Team ${block.teamId}`}
      {' · Block '}
      {spec.blocks.indexOf(block) + 1}
    </NativeSelectOption>
  ))
  const first = spec.blocks.find((block) => 'competitionId' in block)
  const firstTeam = spec.blocks.find((block) => 'teamId' in block && block.teamId !== null)
  const firstTeamId = firstTeam && 'teamId' in firstTeam ? firstTeam.teamId : null
  const team =
    teams.find((item) => item.teamId === teamId) ??
    teams.find((item) => item.teamId === firstTeamId) ??
    teams[0]
  const preset = viewBlockTypes.find((item) => item.value === type)!
  const binding = viewWidget(preset.widget).context
  const statistical =
    type === 'player-profile' || type === 'player-comparison' || type === 'team-comparison'
  const statisticKind = type === 'team-comparison' ? 'teams' : 'players'
  const canAdd = statistical
    ? Boolean(
        left?.kind === statisticKind && (type === 'player-profile' || right?.kind === statisticKind)
      )
    : binding === 'next-match'
      ? Boolean(source)
      : (binding === 'team' || Boolean(contexts.length)) &&
        (binding === 'competition' || Boolean(team))
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
                            ? { ...item, span: Number(event.target.value) as WidgetColumns }
                            : item
                        )
                      })
                    }
                  >
                    {widgetColumns.map((span) => (
                      <NativeSelectOption key={span} value={span}>
                        {span} {span === 1 ? 'column' : 'columns'}
                      </NativeSelectOption>
                    ))}
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
                    disabled={disabled || removeViewBlock(spec, block.id) === spec}
                    aria-label={`Remove block ${index + 1}`}
                    onClick={() => onChange(removeViewBlock(spec, block.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {'nextMatchBlockId' in block && (
                  <NativeSelect
                    aria-label={`Next match for block ${index + 1}`}
                    value={block.nextMatchBlockId}
                    className="w-full"
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) =>
                          item.id === block.id
                            ? { ...block, nextMatchBlockId: event.target.value }
                            : item
                        )
                      })
                    }
                  >
                    {sourceOptions}
                  </NativeSelect>
                )}
                {block.type === 'team-next-match' &&
                  spec.blocks.some(
                    (item) => 'nextMatchBlockId' in item && item.nextMatchBlockId === block.id
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      Removing this block also removes all widgets linked to it.
                    </p>
                  )}
                {block.type === 'player-profile' && (
                  <ViewStatisticPicker
                    disabled={disabled}
                    kind="players"
                    label={`Block ${index + 1}`}
                    selection={block.selection}
                    onSelect={(context) =>
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) =>
                          item.id === block.id
                            ? { ...block, selection: playerViewSelection(context) }
                            : item
                        )
                      })
                    }
                  />
                )}
                {(block.type === 'player-comparison' || block.type === 'team-comparison') &&
                  (['left', 'right'] as const).map((side) => (
                    <ViewStatisticPicker
                      disabled={disabled}
                      key={side}
                      kind={block.type === 'team-comparison' ? 'teams' : 'players'}
                      label={`${side === 'left' ? 'First' : 'Second'} selection for block ${index + 1}`}
                      selection={block[side]}
                      onSelect={(context) =>
                        onChange({
                          ...spec,
                          blocks: spec.blocks.map((item) =>
                            item.id === block.id
                              ? block.type === 'team-comparison'
                                ? {
                                    ...block,
                                    [side]: {
                                      ...teamViewSelection(context),
                                      matchLocation: block[side].matchLocation
                                    }
                                  }
                                : { ...block, [side]: playerViewSelection(context) }
                              : item
                          )
                        })
                      }
                    />
                  ))}
                {'teamId' in block && block.teamId !== null && (
                  <ViewTeamSelect
                    aria-label={`Team for block ${index + 1}`}
                    className="w-full"
                    value={block.teamId}
                    teams={teams}
                    disabled={disabled || !teams.length}
                    onChange={(event) =>
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) =>
                          item.id === block.id
                            ? { ...block, teamId: Number(event.target.value) }
                            : item
                        )
                      })
                    }
                  />
                )}
              </Card>
            </li>
          ))}
        </ol>
        {
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (canAdd && !disabled)
                onChange(
                  addViewBlock(spec, type, context, team, {
                    nextMatchBlockId: source?.id,
                    left: left ?? undefined,
                    right: right ?? undefined
                  })
                )
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="block-type">New block</Label>
              <NativeSelect
                id="block-type"
                value={type}
                disabled={disabled}
                onChange={(event) => {
                  setType(event.target.value as ViewBlockType)
                  setLeft(null)
                  setRight(null)
                }}
              >
                {viewBlockTypes.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {(binding === 'competition' || binding === 'team-season') && context && (
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
            )}
            {(binding === 'team' || binding === 'team-season') && team && (
              <div className="space-y-2">
                <Label htmlFor="block-team">Team for new block</Label>
                <ViewTeamSelect
                  id="block-team"
                  value={team.teamId}
                  teams={teams}
                  disabled={disabled}
                  onChange={(event) => setTeamId(Number(event.target.value))}
                />
              </div>
            )}
            {statistical && (
              <ViewStatisticPicker
                disabled={disabled}
                key={`${type}-left`}
                kind={statisticKind}
                label="First selection"
                selection={
                  left
                    ? statisticKind === 'players'
                      ? playerViewSelection(left)
                      : teamViewSelection(left)
                    : undefined
                }
                onSelect={setLeft}
                onPending={() => setLeft(null)}
              />
            )}
            {statistical && type !== 'player-profile' && (
              <ViewStatisticPicker
                disabled={disabled}
                key={`${type}-right`}
                kind={statisticKind}
                label="Second selection"
                selection={
                  right
                    ? statisticKind === 'players'
                      ? playerViewSelection(right)
                      : teamViewSelection(right)
                    : undefined
                }
                onSelect={setRight}
                onPending={() => setRight(null)}
              />
            )}
            {binding === 'next-match' && source && (
              <div className="space-y-2">
                <Label htmlFor="block-next-match">Follow next match</Label>
                <NativeSelect
                  id="block-next-match"
                  value={source.id}
                  disabled={disabled}
                  onChange={(event) => setNextMatchBlockId(event.target.value)}
                >
                  {sourceOptions}
                </NativeSelect>
              </div>
            )}
            {!canAdd && (
              <p className="text-xs text-muted-foreground">
                {statistical
                  ? 'Choose club and season for each selection.'
                  : binding === 'next-match'
                    ? 'Add a Next match widget first.'
                    : 'Open the team or competition to make its context available.'}
              </p>
            )}
            <Button type="submit" disabled={disabled || !canAdd || spec.blocks.length >= 8}>
              <Plus className="size-4" />
              Add block
            </Button>
            {spec.blocks.length >= 8 && (
              <p className="text-xs text-muted-foreground">
                A view can contain up to eight blocks.
              </p>
            )}
          </form>
        }
      </DialogContent>
    </Dialog>
  )
}
