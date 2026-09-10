import { z } from 'zod'

const entityContext = {
  left: z.number().int().positive(),
  right: z.number().int().positive(),
  leftSeason: z.number().int().positive(),
  rightSeason: z.number().int().positive()
}

export const comparisonSelectionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...entityContext,
    kind: z.literal('teams'),
    leftScope: z.enum(['all', 'home', 'away']),
    rightScope: z.enum(['all', 'home', 'away'])
  }),
  z.strictObject({
    ...entityContext,
    kind: z.literal('players'),
    leftTeam: z.number().int().positive(),
    rightTeam: z.number().int().positive()
  })
])

export type ComparisonSelection = z.infer<typeof comparisonSelectionSchema>

export const savedComparisonSchema = z.strictObject({
  id: z.string().uuid(),
  version: z.literal(1),
  name: z.string().trim().min(1).max(80),
  selection: comparisonSelectionSchema,
  createdAt: z.number(),
  updatedAt: z.number()
})

export type SavedComparison = z.infer<typeof savedComparisonSchema>
