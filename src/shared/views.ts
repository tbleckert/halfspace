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
  })
])

export const viewSpecSchema = z.strictObject({
  version: z.literal(2),
  title: z.string().min(1).max(80),
  message: z.string().max(500),
  blocks: z.array(viewBlockSchema).max(8)
})

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

export const generateViewInputSchema = z
  .strictObject({
    requestId: z.string().uuid(),
    prompt: z.string().trim().min(1).max(2000),
    contexts: z.array(viewContextSchema).max(250),
    teams: z.array(viewTeamContextSchema).max(250),
    current: viewSpecSchema.nullable()
  })
  .refine(
    (input) => input.contexts.length > 0 || input.teams.length > 0,
    'Choose an available team or competition.'
  )

export type ViewBlock = z.infer<typeof viewBlockSchema>
export type ViewSpec = z.infer<typeof viewSpecSchema>
export type ViewContext = z.infer<typeof viewContextSchema>
export type ViewTeamContext = z.infer<typeof viewTeamContextSchema>
export type TeamViewBlock = Extract<ViewBlock, { type: `team-${string}` | 'form-trend' }>
export type CompetitionViewBlock = Exclude<ViewBlock, TeamViewBlock>
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
  teams: readonly ViewTeamContext[] = []
): ViewSpec {
  const spec = viewSpecSchema.parse(value)
  const ids = new Set<string>()
  for (const block of spec.blocks) {
    if (ids.has(block.id)) throw new Error('Each block must have a unique identity.')
    ids.add(block.id)
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
const legacyViewSchema = viewSpecSchema.extend({
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
