import type { DependencyList } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

export function useScopedLiveQuery<T>(
  query: () => T | Promise<T>,
  dependencies: DependencyList
): T | undefined {
  const result = useLiveQuery(
    async () => ({
      dependencies,
      value: await query()
    }),
    [...dependencies]
  )

  // Dexie retains the previous subscription's result while a new query is loading.
  // Keep background updates instant, but never reuse data across query identities.
  if (!result || result.dependencies.length !== dependencies.length) return undefined
  if (!dependencies.every((value, index) => Object.is(value, result.dependencies[index])))
    return undefined
  return result.value
}
