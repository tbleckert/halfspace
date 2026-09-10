import type { ViewBlock, ViewContext, ViewSpec } from '@shared/views'

export const viewBlockTypes = [
  { value: 'standings', label: 'Standings' },
  { value: 'upcoming', label: 'Upcoming fixtures' },
  { value: 'recent', label: 'Recent results' },
  { value: 'goals', label: 'Goals leaders' },
  { value: 'assists', label: 'Assists leaders' },
  { value: 'yellow-cards', label: 'Yellow cards' },
  { value: 'red-cards', label: 'Red cards' }
] as const

export type ViewBlockType = (typeof viewBlockTypes)[number]['value']

export function viewBlockLabel(block: ViewBlock): string {
  const value =
    block.type === 'fixtures'
      ? block.period
      : block.type === 'leaders'
        ? block.category
        : block.type
  return viewBlockTypes.find((item) => item.value === value)!.label
}

export function addViewBlock(spec: ViewSpec, type: ViewBlockType, context: ViewContext): ViewSpec {
  if (spec.blocks.length >= 8) return spec
  const base = {
    id: crypto.randomUUID(),
    competitionId: context.competitionId,
    seasonId: context.seasonId,
    span: 'half' as const
  }
  const block: ViewBlock =
    type === 'standings'
      ? { ...base, type }
      : type === 'upcoming' || type === 'recent'
        ? { ...base, type: 'fixtures', period: type }
        : { ...base, type: 'leaders', category: type }
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
