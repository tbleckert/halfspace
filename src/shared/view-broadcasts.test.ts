import { expect, it } from 'vitest'
import { readStoredViewSpec, validateViewSpec } from './views'

const teams = [{ teamId: 19, teamName: 'Arsenal' }]
const countries = [{ countryId: 47, countryName: 'Sweden' }]
const next = { id: 'next', type: 'team-next-match', teamId: 19, span: 2 }
const broadcasts = {
  id: 'tv',
  type: 'fixture-broadcasts',
  nextMatchBlockId: 'next',
  countryId: 'preferred',
  span: 1
}
const spec = { version: 2, title: 'My team', message: '', blocks: [next, broadcasts] }

it('validates a connected broadcast widget at all three widths and each supported country choice', () => {
  for (const span of [1, 2, 3]) {
    for (const countryId of ['preferred', 'all', 47]) {
      const value = { ...spec, blocks: [next, { ...broadcasts, span, countryId }] }
      expect(validateViewSpec(value, [], teams, countries)).toEqual(value)
      expect(readStoredViewSpec(value)).toEqual(value)
    }
  }
})

it('rejects invented countries and missing or incompatible next-match references', () => {
  expect(() =>
    validateViewSpec(
      { ...spec, blocks: [next, { ...broadcasts, countryId: 99 }] },
      [],
      teams,
      countries
    )
  ).toThrow(/country/i)
  for (const blocks of [
    [broadcasts],
    [next, { ...next, teamId: 20 }, broadcasts],
    [next, { ...broadcasts, nextMatchBlockId: 'other' }],
    [{ ...next, type: 'team-availability' }, broadcasts],
    [{ ...broadcasts, nextMatchBlockId: 'tv' }]
  ]) {
    expect(() => readStoredViewSpec({ ...spec, blocks })).toThrow()
    expect(() => validateViewSpec({ ...spec, blocks }, [], teams, countries)).toThrow()
  }
})
