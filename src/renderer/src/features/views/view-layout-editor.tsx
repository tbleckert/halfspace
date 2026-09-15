import { ViewContextSelect } from './view-context-select'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { ViewContext, ViewSpec, ViewTeamContext, ViewStatisticContext } from '@shared/views'
import { viewWidget, widgetColumns, type WidgetColumns } from '@shared/view-widgets'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
  const [contextKey, setContextKey] = useState('all')
  const [teamId, setTeamId] = useState<number | null>(null)
  const [left, setLeft] = useState<ViewStatisticContext | null>(null)
  const [right, setRight] = useState<ViewStatisticContext | null>(null)
  const [fixtureSourceBlockId, setFixtureSourceBlockId] = useState('')
  const sources = spec.blocks.filter(
    (block) => block.type === 'team-next-match' || block.type === 'market-shortlist'
  )
  const source = sources.find((block) => block.id === fixtureSourceBlockId) ?? sources[0]
  const sourceOptions = sources.map((block) => ({
    value: String(block.id),
    label: (
      <>
        {block.type === 'team-next-match'
          ? `Next match · ${teams.find((team) => team.teamId === block.teamId)?.teamName ?? `Team ${block.teamId}`}`
          : `Market shortlist · ${block.competitionId === null ? 'All available competitions' : (contexts.find((context) => context.competitionId === block.competitionId && context.seasonId === block.seasonId)?.competitionName ?? `Competition ${block.competitionId}`)}`}
        {' · Block '}
        {spec.blocks.indexOf(block) + 1}
      </>
    )
  }))
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
    : binding === 'discovery'
      ? true
      : binding === 'match-source'
        ? Boolean(source)
        : (binding === 'team' || Boolean(contexts.length)) &&
          (binding === 'competition' || Boolean(team))
  const context =
    contexts.find((item) => `${item.competitionId}:${item.seasonId}` === contextKey) ??
    contexts.find(
      (item) => item.competitionId === first?.competitionId && item.seasonId === first?.seasonId
    ) ??
    contexts[0]

  const widthOptions = widgetColumns.map((span) => ({
    value: String(span),
    label: (
      <>
        {span} {span === 1 ? 'column' : 'columns'}
      </>
    )
  }))
  const blockOptions = viewBlockTypes.map((item) => ({
    value: String(item.value),
    label: item.label
  }))
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
                  <Select
                    items={widthOptions}
                    value={String(block.span)}
                    disabled={disabled}
                    onValueChange={(value) => {
                      if (value === null) return
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) =>
                          item.id === block.id
                            ? { ...item, span: Number(value) as WidgetColumns }
                            : item
                        )
                      })
                    }}
                  >
                    <SelectTrigger size="sm" aria-label={`Width of block ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {widthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
                {'competitionId' in block && (
                  <ViewContextSelect
                    aria-label={`Competition and season for block ${index + 1}`}
                    className="w-full"
                    allowAll={block.type === 'market-shortlist'}
                    contexts={contexts}
                    value={
                      block.competitionId === null
                        ? 'all'
                        : `${block.competitionId}:${block.seasonId}`
                    }
                    disabled={disabled}
                    onValueChange={(value) => {
                      const context = contexts.find(
                        (item) => `${item.competitionId}:${item.seasonId}` === value
                      )
                      const next = context
                        ? {
                            ...block,
                            competitionId: context.competitionId,
                            seasonId: context.seasonId,
                            ...(block.type === 'market-shortlist'
                              ? { selectedFixtureId: null }
                              : {})
                          }
                        : block.type === 'market-shortlist'
                          ? {
                              ...block,
                              competitionId: null,
                              seasonId: null,
                              selectedFixtureId: null
                            }
                          : block
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) => (item.id === block.id ? next : item))
                      })
                    }}
                  />
                )}
                {'fixtureSourceBlockId' in block && (
                  <Select
                    items={sourceOptions}
                    value={String(block.fixtureSourceBlockId)}
                    disabled={disabled}
                    onValueChange={(value) => {
                      if (value === null) return
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) =>
                          item.id === block.id ? { ...block, fixtureSourceBlockId: value } : item
                        )
                      })
                    }}
                  >
                    <SelectTrigger
                      aria-label={`Match source for block ${index + 1}`}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {sourceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
                {(block.type === 'team-next-match' || block.type === 'market-shortlist') &&
                  spec.blocks.some(
                    (item) =>
                      'fixtureSourceBlockId' in item && item.fixtureSourceBlockId === block.id
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
                    onValueChange={(value) =>
                      onChange({
                        ...spec,
                        blocks: spec.blocks.map((item) =>
                          item.id === block.id ? { ...block, teamId: Number(value) } : item
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
                  addViewBlock(
                    spec,
                    type,
                    binding === 'discovery' && contextKey === 'all' ? undefined : context,
                    team,
                    {
                      fixtureSourceBlockId: source?.id,
                      left: left ?? undefined,
                      right: right ?? undefined
                    }
                  )
                )
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="block-type">New block</Label>
              <Select
                items={blockOptions}
                value={String(type)}
                disabled={disabled}
                onValueChange={(value) => {
                  if (value === null) return
                  setType(value as ViewBlockType)
                  setLeft(null)
                  setRight(null)
                }}
              >
                <SelectTrigger id="block-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {blockOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {(binding === 'competition' || binding === 'team-season' || binding === 'discovery') &&
              (context || binding === 'discovery') && (
                <div className="space-y-2">
                  <Label htmlFor="block-context">Competition and season for new block</Label>
                  <ViewContextSelect
                    id="block-context"
                    className="max-w-full"
                    allowAll={binding === 'discovery'}
                    value={
                      binding === 'discovery' && contextKey === 'all'
                        ? 'all'
                        : `${context?.competitionId}:${context?.seasonId}`
                    }
                    disabled={disabled}
                    onValueChange={(value) => setContextKey(value)}
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
                  onValueChange={(value) => setTeamId(Number(value))}
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
            {binding === 'match-source' && source && (
              <div className="space-y-2">
                <Label htmlFor="block-next-match">Follow match source</Label>
                <Select
                  items={sourceOptions}
                  value={String(source.id)}
                  disabled={disabled}
                  onValueChange={(value) => {
                    if (value === null) return
                    setFixtureSourceBlockId(value)
                  }}
                >
                  <SelectTrigger id="block-next-match">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!canAdd && (
              <p className="text-xs text-muted-foreground">
                {statistical
                  ? 'Choose club and season for each selection.'
                  : binding === 'match-source'
                    ? 'Add a Next match or Market shortlist widget first.'
                    : 'Open the team or competition to make its context available.'}
              </p>
            )}
            <Button type="submit" disabled={disabled || !canAdd}>
              <Plus className="size-4" />
              Add block
            </Button>
          </form>
        }
      </DialogContent>
    </Dialog>
  )
}
