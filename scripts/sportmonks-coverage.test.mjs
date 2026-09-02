import { describe, expect, it } from 'vitest'
import { calculateCoverage, parseEndpointIndex, parseEndpointPage } from './sportmonks-coverage.mjs'

describe('Sportmonks coverage catalog', () => {
  it('reads endpoint identities and categories from the official index format', () => {
    const endpoints = parseEndpointIndex(`
- [Fixtures](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures.md)
- [GET Fixture by ID](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixture-by-id.md): Returns a fixture.
`)

    expect(endpoints).toEqual([
      {
        id: 'fixtures/get-fixture-by-id',
        category: 'Fixtures',
        method: 'GET',
        name: 'Fixture by ID',
        documentation:
          'https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixture-by-id'
      }
    ])
  })

  it('normalizes documented nested includes without reading later explanatory hints', () => {
    const endpoint = parseEndpointPage(`
https://api.sportmonks.com/v3/football/players/{ID}

#### Include options

[\`nationality\`](https://example.com)[\`teams.team\`](https://example.com) \`latest\`

{% hint style="info" %}
The \`latest\` include on \`Player\` returns lineup records.
`)

    expect(endpoint).toEqual({
      path: '/v3/football/players/{ID}',
      includes: ['nationality', 'teams', 'latest']
    })
  })

  it('supports plain-text include names and bold-only section headings', () => {
    expect(
      parseEndpointPage(`
https://api.sportmonks.com/v3/football/statistics/stages/{ID}

**Include options**

participant&#x20;
`).includes
    ).toEqual(['participant'])
  })

  it('does not count NONE as an include', () => {
    expect(
      parseEndpointPage(`
https://api.sportmonks.com/v3/football/schedules/seasons/{ID}

### Include options

\`NONE\`
`).includes
    ).toEqual([])
  })

  it('does not count unavailability prose as include names', () => {
    expect(
      parseEndpointPage(`
https://api.sportmonks.com/v3/football/markets

### Include options

Not applicable.
`).includes
    ).toEqual([])
  })

  it('prefers an explicit available-includes list over introductory prose', () => {
    expect(
      parseEndpointPage(`
https://api.sportmonks.com/v3/football/seasons/{ID}/brackets

### Includes

Add includes to get complete fixture data.

#### Available Includes

\`participants\` \`scores (see note below)\`
`).includes
    ).toEqual(['participants', 'scores'])
  })

  it('rejects missing catalog sections instead of silently lowering the denominator', () => {
    expect(() => parseEndpointIndex('# An empty index')).toThrow('No endpoints found')
    expect(() => parseEndpointPage('https://api.sportmonks.com/v3/football/fixtures')).toThrow(
      'no include options section'
    )
  })
})

describe('Sportmonks product coverage', () => {
  const catalog = {
    schemaVersion: 1,
    endpoints: [
      { id: 'fixtures/by-id', includes: ['participants', 'events'] },
      { id: 'teams/by-id', includes: ['country'] }
    ]
  }

  it('counts endpoint/include pairs independently', () => {
    const result = calculateCoverage(catalog, {
      schemaVersion: 1,
      endpoints: { 'fixtures/by-id': ['participants'] }
    })

    expect(result).toMatchObject({
      coveredEndpoints: 1,
      totalEndpoints: 2,
      coveredIncludes: 1,
      totalIncludes: 3,
      percentage: 40
    })
  })

  it('rejects coverage that is not in the official catalog', () => {
    expect(() =>
      calculateCoverage(catalog, {
        schemaVersion: 1,
        endpoints: { 'fixtures/missing': [] }
      })
    ).toThrow('Unknown covered endpoint')

    expect(() =>
      calculateCoverage(catalog, {
        schemaVersion: 1,
        endpoints: { 'fixtures/by-id': ['missing'] }
      })
    ).toThrow('Unknown include')
  })
})
