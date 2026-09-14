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
  {
    id: 'research',
    title: 'Research matches',
    description: 'A match shortlist with prices, probabilities and match context.'
  },
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
    template === 'research'
      ? [
          {
            ...base,
            id: 'shortlist',
            type: 'market-shortlist',
            span: 2,
            period: 'next-seven-days',
            outcome: 'all',
            selectedFixtureId: null
          },
          {
            id: 'probability',
            type: 'probability-context',
            span: 1,
            fixtureSourceBlockId: 'shortlist',
            market: 'match-result'
          },
          {
            id: 'prices',
            type: 'odds-comparison',
            span: 3,
            fixtureSourceBlockId: 'shortlist',
            marketId: null,
            bookmakerId: null
          },
          {
            id: 'meetings',
            type: 'fixture-head-to-head',
            span: 2,
            fixtureSourceBlockId: 'shortlist'
          },
          { id: 'absences', type: 'fixture-absences', span: 1, fixtureSourceBlockId: 'shortlist' }
        ]
      : template === 'overview'
        ? [
            { ...base, id: 'table', type: 'standings', teamId: null },
            goals,
            { ...upcoming, span: 3 }
          ]
        : template === 'leaders'
          ? [goals, { ...base, id: 'assists', type: 'leaders', category: 'assists' }]
          : [upcoming, { ...base, id: 'recent', type: 'fixtures', period: 'recent' }]
  return validateViewSpec(
    {
      version: 3,
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
    fixtureSourceBlockId: 'next-match',
    countryId: 'preferred',
    span: 1
  })
  blocks.push({ id: 'news', type: 'team-news', teamId: team.teamId, span: 1 })
  return validateViewSpec(
    { version: 3, title: `My ${team.teamName}`.slice(0, 80), message: '', blocks },
    context ? [context] : [],
    [team]
  )
}

export function createMatchPreparationView(team: ViewTeamContext, context?: ViewContext): ViewSpec {
  const blocks: ViewBlock[] = [
    { id: 'next-match', type: 'team-next-match', teamId: team.teamId, span: 2 },
    { id: 'weather', type: 'fixture-weather', fixtureSourceBlockId: 'next-match', span: 1 },
    { id: 'meetings', type: 'fixture-head-to-head', fixtureSourceBlockId: 'next-match', span: 2 },
    {
      id: 'broadcasts',
      type: 'fixture-broadcasts',
      fixtureSourceBlockId: 'next-match',
      countryId: 'preferred',
      span: 1
    },
    { id: 'absences', type: 'fixture-absences', fixtureSourceBlockId: 'next-match', span: 3 }
  ]
  if (context)
    blocks.push({
      id: 'squad',
      type: 'team-squad',
      teamId: team.teamId,
      competitionId: context.competitionId,
      seasonId: context.seasonId,
      span: 2
    })
  blocks.push({
    id: 'transfers',
    type: 'team-transfers',
    teamId: team.teamId,
    direction: 'all',
    span: 1
  })
  return validateViewSpec(
    { version: 3, title: `${team.teamName} · Match preparation`.slice(0, 80), message: '', blocks },
    context ? [context] : [],
    [team]
  )
}
