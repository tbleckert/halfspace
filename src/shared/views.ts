import { z } from 'zod'
import type { Result } from './contracts'

export const viewModel = 'gpt-5.4-mini'

const blockContext = {
  id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/),
  competitionId: z.number().int().positive(),
  seasonId: z.number().int().positive(),
  span: z.enum(['half', 'full'])
}

// Zod unions emit anyOf; OpenAI rejects oneOf from discriminatedUnion.
export const viewBlockSchema = z.union([
  z.strictObject({
    ...blockContext,
    type: z.literal('fixtures'),
    period: z.enum(['upcoming', 'recent'])
  }),
  z.strictObject({ ...blockContext, type: z.literal('standings') }),
  z.strictObject({
    ...blockContext,
    type: z.literal('leaders'),
    category: z.enum(['goals', 'assists', 'yellow-cards', 'red-cards'])
  })
])

export const viewSpecSchema = z.strictObject({
  version: z.literal(1),
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

export const generateViewInputSchema = z.strictObject({
  requestId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(2000),
  contexts: z.array(viewContextSchema).min(1).max(250),
  current: viewSpecSchema.nullable()
})

export type ViewBlock = z.infer<typeof viewBlockSchema>
export type ViewSpec = z.infer<typeof viewSpecSchema>
export type ViewContext = z.infer<typeof viewContextSchema>
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

export function validateViewSpec(value: unknown, contexts: readonly ViewContext[]): ViewSpec {
  const spec = viewSpecSchema.parse(value)
  const ids = new Set<string>()
  for (const block of spec.blocks) {
    if (ids.has(block.id)) throw new Error('Each block must have a unique identity.')
    ids.add(block.id)
    if (
      !contexts.some(
        (context) =>
          context.competitionId === block.competitionId && context.seasonId === block.seasonId
      )
    ) {
      throw new Error('The view references an unavailable competition or season.')
    }
  }
  return spec
}
