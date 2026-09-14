import {
  validateViewSpec,
  type ViewBlock,
  type ViewContext,
  type ViewSpec,
  type ViewTeamContext
} from '@shared/views'

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
    span: 1 as const
  }
  const upcoming: ViewBlock = { ...base, id: 'upcoming', type: 'fixtures', period: 'upcoming' }
  const goals: ViewBlock = { ...base, id: 'goals', type: 'leaders', category: 'goals' }
  const blocks: ViewBlock[] =
    template === 'overview'
      ? [{ ...base, id: 'table', type: 'standings', teamId: null }, goals, { ...upcoming, span: 3 }]
      : template === 'leaders'
        ? [goals, { ...base, id: 'assists', type: 'leaders', category: 'assists' }]
        : [upcoming, { ...base, id: 'recent', type: 'fixtures', period: 'recent' }]
  return validateViewSpec(
    {
      version: 2,
      title: `${context.competitionName} · ${context.seasonName}`.slice(0, 80),
      message: '',
      blocks
    },
    [context]
  )
}

export function createTeamStarterView(team: ViewTeamContext, context?: ViewContext): ViewSpec {
  const blocks: ViewBlock[] = [
    { id: 'next-match', type: 'team-next-match', teamId: team.teamId, span: 2 }
  ]
  if (context)
    blocks.push({
      id: 'season',
      type: 'team-season',
      teamId: team.teamId,
      competitionId: context.competitionId,
      seasonId: context.seasonId,
      span: 1
    })
  blocks.push({
    id: 'fixtures',
    type: 'team-fixtures',
    teamId: team.teamId,
    period: 'upcoming',
    span: 1
  })
  if (context)
    blocks.push({
      id: 'table',
      type: 'standings',
      teamId: team.teamId,
      competitionId: context.competitionId,
      seasonId: context.seasonId,
      span: 1
    })
  blocks.push({ id: 'availability', type: 'team-availability', teamId: team.teamId, span: 1 })
  blocks.push({
    id: 'form',
    type: 'form-trend',
    teamId: team.teamId,
    span: 2,
    matchLocation: 'all'
  })
  blocks.push({
    id: 'broadcasts',
    type: 'fixture-broadcasts',
    nextMatchBlockId: 'next-match',
    countryId: 'preferred',
    span: 1
  })
  blocks.push({ id: 'news', type: 'team-news', teamId: team.teamId, span: 1 })
  return validateViewSpec(
    { version: 2, title: `My ${team.teamName}`.slice(0, 80), message: '', blocks },
    context ? [context] : [],
    [team]
  )
}
