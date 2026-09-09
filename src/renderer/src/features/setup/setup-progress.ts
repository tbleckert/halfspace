export type SetupStep = 'competitions' | 'teams' | 'complete'
const storageKey = 'halfspace:setup'

export function readSetupStep(): SetupStep | null {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'competitions' || value === 'teams' || value === 'complete' ? value : null
  } catch {
    return null
  }
}

export function saveSetupStep(step: SetupStep): void {
  localStorage.setItem(storageKey, step)
}
