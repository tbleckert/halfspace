import { z } from 'zod'
import type { Result } from './contracts'

export const viewModel = 'gpt-5.4-mini'

const blockLayout = {
  id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/),
  span: z.union([z.literal(1), z.literal(2), z.literal(3)])
}
const competitionBinding = {
  competitionId: z.number().int().positive(),
  seasonId: z.number().int().positive()
}
const blockContext = { ...blockLayout, ...competitionBinding }
const teamBinding = { teamId: z.number().int().positive() }
export const playerViewSelectionSchema = z.strictObject({
  ...competitionBinding,
  ...teamBinding,
  playerId: z.number().int().positive()
})
export const teamViewSelectionSchema = z.strictObject({
  ...competitionBinding,
  ...teamBinding,
  matchLocation: z.enum(['all', 'home', 'away'])
})

// Zod unions emit anyOf; OpenAI rejects oneOf from discriminatedUnion.
// Choose the type before overlapping bindings in the provider's ordered output.
export const viewBlockSchema = z.union([
  z.strictObject({
    type: z.literal('fixtures'),
    ...blockContext,
    period: z.enum(['upcoming', 'recent'])
  }),
  z.strictObject({
    type: z.literal('standings'),
    ...blockContext,
    teamId: z.number().int().positive().nullable()
  }),
  z.strictObject({
    type: z.literal('leaders'),
    ...blockContext,
    category: z.enum(['goals', 'assists', 'yellow-cards', 'red-cards'])
  }),
  z.strictObject({ type: z.literal('team-next-match'), ...blockLayout, ...teamBinding }),
  z.strictObject({
    type: z.literal('team-fixtures'),
    ...blockLayout,
    ...teamBinding,
    period: z.enum(['upcoming', 'recent'])
  }),
  z.strictObject({ type: z.literal('team-season'), ...blockContext, ...teamBinding }),
  z.strictObject({ type: z.literal('team-availability'), ...blockLayout, ...teamBinding }),
  z.strictObject({
    type: z.literal('form-trend'),
    ...blockLayout,
    ...teamBinding,
    matchLocation: z.enum(['all', 'home', 'away'])
  }),
  z.strictObject({ type: z.literal('team-news'), ...blockLayout, ...teamBinding }),
  z.strictObject({
    type: z.literal('player-profile'),
    ...blockLayout,
    selection: playerViewSelectionSchema
  }),
  z.strictObject({
    type: z.literal('player-comparison'),
    ...blockLayout,
    left: playerViewSelectionSchema,
    right: playerViewSelectionSchema
  }),
  z.strictObject({
    type: z.literal('team-comparison'),
    ...blockLayout,
    left: teamViewSelectionSchema,
    right: teamViewSelectionSchema
  }),
  z.strictObject({
    type: z.literal('odds-comparison'),
    ...blockLayout,
    nextMatchBlockId: blockLayout.id,
    marketId: z.number().int().positive().nullable(),
    bookmakerId: z.number().int().positive().nullable()
  }),
  z.strictObject({
    type: z.literal('fixture-broadcasts'),
    ...blockLayout,
    nextMatchBlockId: blockLayout.id,
    countryId: z.union([z.literal('preferred'), z.literal('all'), z.number().int().positive()])
  })
])

export const viewSpecSchema = z
  .strictObject({
    version: z.literal(2),
    title: z.string().min(1).max(80),
    message: z.string().max(500),
    blocks: z.array(viewBlockSchema).max(8)
  })
  .refine(
    (spec) => new Set(spec.blocks.map((block) => block.id)).size === spec.blocks.length,
    'Each block must have a unique identity.'
  )
  .refine(
    (spec) =>
      spec.blocks.every(
        (block) =>
          !('nextMatchBlockId' in block) ||
          spec.blocks.some(
            (source) => source.id === block.nextMatchBlockId && source.type === 'team-next-match'
          )
      ),
    'Match-linked widgets must follow an existing Next match widget.'
  )

export const viewContextSchema = z.strictObject({
  competitionId: z.number().int().positive(),
  competitionName: z.string().min(1).max(200),
  seasonId: z.number().int().positive(),
  seasonName: z.string().min(1).max(100),
  isCurrent: z.boolean()
})
export const viewTeamContextSchema = z.strictObject({
  teamId: z.number().int().positive(),
  teamName: z.string().min(1).max(200),
  currentSeasons: z.array(z.strictObject(competitionBinding)).optional()
})
export const viewCountryContextSchema = z.strictObject({
  countryId: z.number().int().positive(),
  countryName: z.string().min(1).max(200)
})

export const viewStatisticContextSchema = z.strictObject({
  kind: z.enum(['teams', 'players']),
  entityId: z.number().int().positive(),
  entityName: z.string().min(1).max(200),
  ...competitionBinding,
  ...teamBinding,
  competitionName: z.string().min(1).max(200),
  seasonName: z.string().min(1).max(100),
  teamName: z.string().min(1).max(200)
})
const namedIdentitySchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200)
})
export const viewResearchContextSchema = z.strictObject({
  statistics: z.array(viewStatisticContextSchema).max(250),
  markets: z.array(namedIdentitySchema).max(250),
  bookmakers: z.array(namedIdentitySchema).max(250)
})
export type ViewStatisticContext = z.infer<typeof viewStatisticContextSchema>
export type ViewResearchContext = z.infer<typeof viewResearchContextSchema>
export type PlayerViewSelection = z.infer<typeof playerViewSelectionSchema>
export type TeamViewSelection = z.infer<typeof teamViewSelectionSchema>
export const emptyViewResearchContext: ViewResearchContext = {
  statistics: [],
  markets: [],
  bookmakers: []
}

export const generateViewInputSchema = z
  .strictObject({
    requestId: z.string().uuid(),
    prompt: z.string().trim().min(1).max(2000),
    contexts: z.array(viewContextSchema).max(250),
    teams: z.array(viewTeamContextSchema).max(250),
    countries: z.array(viewCountryContextSchema).max(250),
    research: viewResearchContextSchema,
    current: viewSpecSchema.nullable()
  })
  .refine(
    (input) =>
      input.contexts.length > 0 || input.teams.length > 0 || input.research.statistics.length > 0,
    'Choose an available team or competition.'
  )

export type ViewBlock = z.infer<typeof viewBlockSchema>
export type ViewSpec = z.infer<typeof viewSpecSchema>
export type ViewContext = z.infer<typeof viewContextSchema>
export type ViewTeamContext = z.infer<typeof viewTeamContextSchema>
export type ViewCountryContext = z.infer<typeof viewCountryContextSchema>
export type TeamViewBlock = Extract<
  ViewBlock,
  {
    type:
      | 'team-next-match'
      | 'team-fixtures'
      | 'team-season'
      | 'team-availability'
      | 'team-news'
      | 'form-trend'
  }
>
export type BroadcastViewBlock = Extract<ViewBlock, { type: 'fixture-broadcasts' }>
export type CompetitionViewBlock = Extract<
  ViewBlock,
  { type: 'fixtures' | 'standings' | 'leaders' }
>
export type StatisticViewBlock = Extract<
  ViewBlock,
  { type: 'player-profile' | 'player-comparison' | 'team-comparison' }
>
export type GenerateViewInput = z.infer<typeof generateViewInputSchema>
export interface ViewProgress {
  requestId: string
  blocks: ViewBlock[]
}

export interface SavedView {
  id: string
  spec: ViewSpec
  previousSpec: ViewSpec | null
  createdAt: number
  updatedAt: number
}

export interface ViewsApi {
  getSettings(): Promise<Result<{ configured: boolean }>>
  saveKey(input: { key: string }): Promise<Result<null>>
  clearKey(): Promise<Result<null>>
  generate(input: GenerateViewInput): Promise<Result<ViewSpec>>
  cancel(requestId: string): Promise<void>
  onProgress(listener: (progress: ViewProgress) => void): () => void
}

export function validateViewSpec(
  value: unknown,
  contexts: readonly ViewContext[],
  teams: readonly ViewTeamContext[] = [],
  countries: readonly ViewCountryContext[] = [],
  research: ViewResearchContext = emptyViewResearchContext
): ViewSpec {
  const spec = viewSpecSchema.parse(value)
  for (const block of spec.blocks) {
    if (
      block.type === 'player-profile' ||
      block.type === 'player-comparison' ||
      block.type === 'team-comparison'
    ) {
      const kind = block.type === 'team-comparison' ? 'teams' : 'players'
      const selections =
        block.type === 'player-profile' ? [block.selection] : [block.left, block.right]
      for (const selection of selections) {
        if (
          !research.statistics.some(
            (context) =>
              context.kind === kind &&
              context.entityId ===
                ('playerId' in selection ? selection.playerId : selection.teamId) &&
              context.teamId === selection.teamId &&
              context.competitionId === selection.competitionId &&
              context.seasonId === selection.seasonId
          )
        )
          throw new Error('The view references an unavailable statistics selection.')
      }
    }
    if (block.type === 'odds-comparison') {
      if (
        block.marketId !== null &&
        !research.markets.some((market) => market.id === block.marketId)
      )
        throw new Error('The view references an unavailable odds market.')
      if (
        block.bookmakerId !== null &&
        !research.bookmakers.some((bookmaker) => bookmaker.id === block.bookmakerId)
      )
        throw new Error('The view references an unavailable bookmaker.')
    }
    if (
      block.type === 'fixture-broadcasts' &&
      typeof block.countryId === 'number' &&
      !countries.some((country) => country.countryId === block.countryId)
    ) {
      throw new Error('The view references an unavailable broadcast country.')
    }
    if (
      'competitionId' in block &&
      !contexts.some(
        (context) =>
          context.competitionId === block.competitionId && context.seasonId === block.seasonId
      )
    ) {
      throw new Error('The view references an unavailable competition or season.')
    }
    if (
      'teamId' in block &&
      block.teamId !== null &&
      !teams.some((team) => team.teamId === block.teamId)
    ) {
      throw new Error('The view references an unavailable team.')
    }
  }
  return spec
}

// Saved v1 definitions already exist on user installations. Upgrade only this storage
// boundary; the model, IPC, editor and all new writes use the strict v2 schema.
const legacyBlockContext = { ...blockContext, span: z.enum(['half', 'full']) }
const legacyViewSchema = z.strictObject({
  ...viewSpecSchema.shape,
  version: z.literal(1),
  blocks: z
    .array(
      z.union([
        z.strictObject({
          ...legacyBlockContext,
          type: z.literal('fixtures'),
          period: z.enum(['upcoming', 'recent'])
        }),
        z.strictObject({ ...legacyBlockContext, type: z.literal('standings') }),
        z.strictObject({
          ...legacyBlockContext,
          type: z.literal('leaders'),
          category: z.enum(['goals', 'assists', 'yellow-cards', 'red-cards'])
        })
      ])
    )
    .max(8)
})

export function readStoredViewSpec(value: unknown): ViewSpec {
  const current = viewSpecSchema.safeParse(value)
  if (current.success) return current.data
  const legacy = legacyViewSchema.parse(value)
  return viewSpecSchema.parse({
    ...legacy,
    version: 2,
    blocks: legacy.blocks.map((block) => ({
      ...block,
      span: block.span === 'full' ? 3 : 1,
      ...(block.type === 'standings' ? { teamId: null } : {})
    }))
  })
}
