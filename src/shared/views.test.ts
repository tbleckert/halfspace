import { describe, expect, it } from 'vitest'
import { validateViewSpec, viewBlockSchema } from './views'

const context = [
  {
    competitionId: 8,
    competitionName: 'Premier League',
    seasonId: 12,
    seasonName: '2026/27',
    isCurrent: true
  }
]
const block = { id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'half' }
const spec = { version: 1, title: 'Match centre', message: '', blocks: [block] }

describe('view definitions', () => {
  it('accepts supported blocks bound to a known competition and season', () => {
    expect(validateViewSpec(spec, context)).toEqual(spec)
  })

  it('rejects an invented or mismatched season and duplicate block identities', () => {
    expect(() =>
      validateViewSpec({ ...spec, blocks: [{ ...block, seasonId: 99 }] }, context)
    ).toThrow(/season/i)
    expect(() => validateViewSpec({ ...spec, blocks: [block, block] }, context)).toThrow(/unique/i)
  })

  it('rejects executable content, unknown blocks, and excessive layouts', () => {
    expect(
      viewBlockSchema.safeParse({ ...block, code: 'fetch("https://example.com")' }).success
    ).toBe(false)
    expect(viewBlockSchema.safeParse({ ...block, type: 'html' }).success).toBe(false)
    expect(() =>
      validateViewSpec(
        { ...spec, blocks: Array.from({ length: 9 }, (_, i) => ({ ...block, id: String(i) })) },
        context
      )
    ).toThrow()
  })

  it('allows an explanation when the requested view cannot be built', () => {
    expect(
      validateViewSpec(
        { ...spec, message: 'Team comparisons are not available yet.', blocks: [] },
        context
      ).blocks
    ).toEqual([])
  })
})
