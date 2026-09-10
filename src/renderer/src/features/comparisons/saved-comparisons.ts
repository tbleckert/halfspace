import {
  savedComparisonSchema,
  type ComparisonSelection,
  type SavedComparison
} from '@shared/comparisons'
import { db } from '@/data/db'

export async function saveComparison(
  name: string,
  selection: ComparisonSelection
): Promise<SavedComparison> {
  const now = Date.now()
  const saved = savedComparisonSchema.parse({
    id: crypto.randomUUID(),
    version: 1,
    name,
    selection,
    createdAt: now,
    updatedAt: now
  })
  await db.savedComparisons.add(saved)
  return saved
}
