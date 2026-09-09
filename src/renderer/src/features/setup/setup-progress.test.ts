// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { readSetupStep, saveSetupStep } from './setup-progress'

beforeEach(() => localStorage.clear())

describe('first-run progress', () => {
  it('leaves an existing configured installation alone until setup is explicitly started', () => {
    expect(readSetupStep()).toBeNull()
  })
  it('persists the current step and completion across remounts', () => {
    saveSetupStep('competitions')
    expect(readSetupStep()).toBe('competitions')
    saveSetupStep('teams')
    expect(readSetupStep()).toBe('teams')
    saveSetupStep('complete')
    expect(readSetupStep()).toBe('complete')
  })
})
