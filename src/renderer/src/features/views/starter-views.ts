import { validateViewSpec, type ViewBlock, type ViewContext, type ViewSpec } from '@shared/views'

export const starterViews = [
  {
    id: 'overview',
    title: 'The full picture',
    description: 'Fixtures, standings, and goals leaders.'
  },
  { id: 'leaders', title: 'Goals & assists', description: 'The two leaderboards side by side.' },
  { id: 'matchday', title: 'Around matchday', description: 'Upcoming fixtures and recent results.' }
] as const

export type StarterView = (typeof starterViews)[number]['id']

export function createStarterView(template: StarterView, context: ViewContext): ViewSpec {
  const base = {
    competitionId: context.competitionId,
    seasonId: context.seasonId,
    span: 'half' as const
  }
  const upcoming: ViewBlock = { ...base, id: 'upcoming', type: 'fixtures', period: 'upcoming' }
  const goals: ViewBlock = { ...base, id: 'goals', type: 'leaders', category: 'goals' }
  const blocks: ViewBlock[] =
    template === 'overview'
      ? [{ ...base, id: 'table', type: 'standings' }, goals, { ...upcoming, span: 'full' }]
      : template === 'leaders'
        ? [goals, { ...base, id: 'assists', type: 'leaders', category: 'assists' }]
        : [upcoming, { ...base, id: 'recent', type: 'fixtures', period: 'recent' }]
  return validateViewSpec(
    {
      version: 1,
      title: `${context.competitionName} · ${context.seasonName}`.slice(0, 80),
      message: '',
      blocks
    },
    [context]
  )
}
