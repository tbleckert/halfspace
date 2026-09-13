import {
  viewSpecSchema,
  type ViewBlock,
  type ViewContext,
  type ViewSpec,
  type ViewTeamContext
} from '@shared/views'
import { implementedViewWidgets, viewWidget, type ViewWidgetType } from '@shared/view-widgets'

export type ViewBlockType =
  | ViewWidgetType
  | 'upcoming'
  | 'recent'
  | 'goals'
  | 'assists'
  | 'yellow-cards'
  | 'red-cards'
  | 'team-upcoming'
  | 'team-recent'
export const viewBlockTypes = implementedViewWidgets.flatMap<{
  value: ViewBlockType
  label: string
  widget: ViewWidgetType
}>((widget) => {
  if (widget.type === 'fixtures')
    return [
      { value: 'upcoming', label: 'Upcoming fixtures', widget: widget.type },
      { value: 'recent', label: 'Recent results', widget: widget.type }
    ]
  if (widget.type === 'leaders')
    return (['goals', 'assists', 'yellow-cards', 'red-cards'] as const).map((category) => ({
      value: category,
      label: `${category.replace('-', ' ')} leaders`,
      widget: widget.type
    }))
  if (widget.type === 'team-fixtures')
    return [
      { value: 'team-upcoming', label: 'Upcoming team fixtures', widget: widget.type },
      { value: 'team-recent', label: 'Recent team results', widget: widget.type }
    ]
  return [{ value: widget.type, label: widget.label, widget: widget.type }]
})

export function viewBlockLabel(block: ViewBlock): string {
  const value =
    block.type === 'fixtures'
      ? block.period
      : block.type === 'leaders'
        ? block.category
        : block.type
  if (block.type === 'team-fixtures')
    return block.period === 'upcoming' ? 'Upcoming team fixtures' : 'Recent team results'
  return viewBlockTypes.find((item) => item.value === value)?.label ?? viewWidget(block.type).label
}

export function addViewBlock(
  spec: ViewSpec,
  type: ViewBlockType,
  context?: ViewContext,
  team?: ViewTeamContext
): ViewSpec {
  if (spec.blocks.length >= 8) return spec
  const base = {
    id: crypto.randomUUID(),
    span: 1 as const
  }
  const widgetType =
    viewBlockTypes.find((preset) => preset.value === type)?.widget ?? (type as ViewWidgetType)
  const widget = viewWidget(widgetType)
  if (widget.context !== 'competition' && !team) throw new Error('Choose a team for this widget.')
  if (widget.context !== 'team' && !context) throw new Error('Choose a competition and season.')
  const competition = context
    ? { competitionId: context.competitionId, seasonId: context.seasonId }
    : null
  let block: ViewBlock
  switch (widgetType) {
    case 'team-next-match':
      block = { ...base, type: widgetType, teamId: team!.teamId, span: 2 }
      break
    case 'team-availability':
      block = { ...base, type: widgetType, teamId: team!.teamId }
      break
    case 'team-fixtures':
      block = {
        ...base,
        type: widgetType,
        teamId: team!.teamId,
        period: type === 'team-recent' ? 'recent' : 'upcoming'
      }
      break
    case 'team-season':
      block = { ...base, ...competition!, type: widgetType, teamId: team!.teamId }
      break
    case 'standings':
      block = { ...base, ...competition!, type: widgetType, teamId: null }
      break
    case 'fixtures':
      block = {
        ...base,
        ...competition!,
        type: widgetType,
        period: type === 'recent' ? 'recent' : 'upcoming'
      }
      break
    case 'leaders':
      block = {
        ...base,
        ...competition!,
        type: widgetType,
        category: (['goals', 'assists', 'yellow-cards', 'red-cards'].includes(type)
          ? type
          : 'goals') as Extract<ViewBlock, { type: 'leaders' }>['category']
      }
      break
  }
  return { ...spec, blocks: [...spec.blocks, block] }
}

export function removeViewBlock(spec: ViewSpec, id: string): ViewSpec {
  if (spec.blocks.length <= 1) return spec
  return { ...spec, blocks: spec.blocks.filter((block) => block.id !== id) }
}

export function moveViewBlock(spec: ViewSpec, id: string, direction: -1 | 1): ViewSpec {
  const index = spec.blocks.findIndex((block) => block.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= spec.blocks.length) return spec
  const blocks = [...spec.blocks]
  const [block] = blocks.splice(index, 1)
  blocks.splice(target, 0, block)
  return { ...spec, blocks }
}

export function changeViewContext(
  spec: ViewSpec,
  context: ViewContext,
  available: ViewContext[]
): ViewSpec {
  const first = spec.blocks.find((block) => 'competitionId' in block)
  const original = available.find(
    (item) => item.competitionId === first?.competitionId && item.seasonId === first?.seasonId
  )
  const hasDefaultTitle =
    original &&
    spec.blocks.every(
      (block) =>
        'competitionId' in block &&
        block.competitionId === original.competitionId &&
        block.seasonId === original.seasonId
    ) &&
    spec.title === `${original.competitionName} · ${original.seasonName}`.slice(0, 80)
  if (
    !available.some(
      (item) => item.competitionId === context.competitionId && item.seasonId === context.seasonId
    )
  )
    throw new Error('The competition or season is unavailable.')
  return viewSpecSchema.parse({
    ...spec,
    title: hasDefaultTitle
      ? `${context.competitionName} · ${context.seasonName}`.slice(0, 80)
      : spec.title,
    // A generated description can refer to the previous competition or season.
    message: '',
    blocks: spec.blocks.map((block) =>
      'competitionId' in block
        ? {
            ...block,
            competitionId: context.competitionId,
            seasonId: context.seasonId
          }
        : block
    )
  })
}
