import { readFileSync } from 'node:fs'
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

  it('keeps endpoint breadth separate from data capabilities', () => {
    const result = calculateCoverage(catalog, {
      schemaVersion: 1,
      endpoints: { 'fixtures/by-id': ['participants'] }
    })

    expect(result).toMatchObject({
      coveredEndpoints: 1,
      totalEndpoints: 2,
      coveredIncludes: 1,
      totalIncludes: 3,
      coveredCapabilities: 2,
      totalCapabilities: 5,
      endpointPercentage: 50,
      percentage: 40
    })
  })

  it('does not change the badge when the same data has another retrieval endpoint', () => {
    const coverage = {
      schemaVersion: 1,
      endpoints: { 'fixtures/by-id': ['participants', 'events'] }
    }
    const before = calculateCoverage(catalog, coverage)
    const expandedCatalog = {
      ...catalog,
      endpoints: [
        ...catalog.endpoints,
        { id: 'fixtures/by-date', includes: ['participants', 'events'] }
      ]
    }
    const unsupported = calculateCoverage(expandedCatalog, coverage)
    const supported = calculateCoverage(expandedCatalog, {
      ...coverage,
      endpoints: { ...coverage.endpoints, 'fixtures/by-date': ['participants', 'events'] }
    })

    for (const result of [unsupported, supported]) {
      expect(result.percentage).toBe(before.percentage)
      expect(result.totalCapabilities).toBe(before.totalCapabilities)
      expect(result.coveredCapabilities).toBe(before.coveredCapabilities)
    }
    expect(unsupported.coveredEndpoints).toBe(1)
    expect(supported.coveredEndpoints).toBe(2)
  })

  it('adds new documented data to the denominator without declaring support', () => {
    const result = calculateCoverage(
      {
        ...catalog,
        endpoints: [...catalog.endpoints, { id: 'fixtures/by-date', includes: ['weatherReport'] }]
      },
      { schemaVersion: 1, endpoints: { 'fixtures/by-id': ['participants', 'events'] } }
    )

    expect(result.totalCapabilities).toBe(6)
    expect(result.capabilities.get('fixtures:weatherReport').sources).toEqual([])
  })

  it('keeps the same include name separate for different entities', () => {
    const result = calculateCoverage(
      {
        schemaVersion: 1,
        endpoints: [
          { id: 'teams/by-id', includes: ['statistics'] },
          { id: 'players/by-id', includes: ['statistics'] }
        ]
      },
      { schemaVersion: 1, endpoints: { 'teams/by-id': ['statistics'] } }
    )

    expect(result.totalCapabilities).toBe(4)
    expect(result.capabilities.get('teams:statistics').sources).toHaveLength(1)
    expect(result.capabilities.get('players:statistics').sources).toEqual([])
  })

  it('counts an include and an equivalent dedicated feed once, whichever is supported', () => {
    const feedCatalog = {
      schemaVersion: 1,
      endpoints: [
        { id: 'fixtures/by-id', includes: ['odds', 'inplayOdds'] },
        { id: 'odds/prematch', includes: [] }
      ]
    }
    const model = { schemaVersion: 1, aliases: { odds: 'fixtures:odds' } }
    for (const endpoints of [
      { 'fixtures/by-id': ['odds'] },
      { 'fixtures/by-id': [], 'odds/prematch': [] },
      { 'fixtures/by-id': ['odds'], 'odds/prematch': [] }
    ]) {
      const result = calculateCoverage(feedCatalog, { schemaVersion: 1, endpoints }, model)
      expect(result).toMatchObject({ totalCapabilities: 3, coveredCapabilities: 2 })
      expect(result.capabilities.has('odds')).toBe(false)
      expect(result.capabilities.get('fixtures:inplayOdds').sources).toEqual([])
    }
  })

  it('assigns includes to the returned entity instead of the documentation category', () => {
    const result = calculateCoverage(
      {
        schemaVersion: 1,
        endpoints: [
          { id: 'fixtures/by-id', includes: ['events'] },
          { id: 'seasons/brackets', includes: ['events'] },
          { id: 'livescores/inplay', includes: ['events'] }
        ]
      },
      { schemaVersion: 1, endpoints: { 'seasons/brackets': ['events'] } },
      {
        schemaVersion: 1,
        groups: { livescores: { entity: 'fixtures' } },
        endpoints: { 'seasons/brackets': { entity: 'brackets', includeEntity: 'fixtures' } }
      }
    )

    expect(result.totalCapabilities).toBe(3)
    expect(result.capabilities.has('seasons:events')).toBe(false)
    expect(result.capabilities.get('fixtures:events').sources).toEqual([
      { endpoint: 'seasons/brackets', include: 'events' }
    ])
  })

  it('requires every reviewed source and include before crediting an equivalent query', () => {
    const equivalenceCatalog = {
      schemaVersion: 1,
      endpoints: [
        { id: 'stations/by-id', includes: ['fixtures'] },
        { id: 'fixtures/past', includes: ['tvStations'] },
        { id: 'fixtures/upcoming', includes: ['tvStations'] }
      ]
    }
    const equivalents = {
      'stations:fixtures': {
        requires: {
          'fixtures/past': ['tvStations'],
          'fixtures/upcoming': ['tvStations']
        },
        reason: 'The station page presents both fixture feeds.'
      }
    }
    for (const [endpoints, supported] of [
      [{ 'fixtures/past': ['tvStations'] }, false],
      [{ 'fixtures/past': ['tvStations'], 'fixtures/upcoming': [] }, false],
      [{ 'fixtures/past': ['tvStations'], 'fixtures/upcoming': ['tvStations'] }, true]
    ]) {
      const result = calculateCoverage(equivalenceCatalog, {
        schemaVersion: 1,
        endpoints,
        equivalents
      })
      expect(result.capabilities.get('stations:fixtures').sources.length > 0).toBe(supported)
      expect(result.totalCapabilities).toBe(4)
      expect(result.coveredIncludes).toBe(supported ? 2 : 1)
    }
  })

  it('rejects stale, invented, or chained capability mappings', () => {
    const coverage = { schemaVersion: 1, endpoints: {} }
    for (const model of [
      { groups: { missing: { entity: 'fixtures' } } },
      { endpoints: { 'fixtures/missing': { entity: 'fixtures' } } },
      { aliases: { missing: 'fixtures' } },
      { aliases: { fixtures: 'missing' } },
      { aliases: { fixtures: 'teams', teams: 'fixtures' } }
    ]) {
      expect(() => calculateCoverage(catalog, coverage, { schemaVersion: 1, ...model })).toThrow()
    }
    for (const equivalents of [
      { missing: { requires: { 'fixtures/by-id': [] }, reason: 'Unknown capability.' } },
      { teams: { requires: { 'teams/missing': [] }, reason: 'Unknown endpoint.' } },
      { teams: { requires: { 'fixtures/by-id': ['missing'] }, reason: 'Unknown include.' } },
      { teams: { requires: {}, reason: 'No evidence.' } },
      { teams: { requires: { 'fixtures/by-id': [] }, reason: '' } }
    ]) {
      expect(() => calculateCoverage(catalog, { ...coverage, equivalents })).toThrow()
    }
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

  it('keeps real catalog feed variants separate when only pre-match data is supported', () => {
    const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
    const result = calculateCoverage(
      read('../docs/sportmonks-api.json'),
      {
        schemaVersion: 1,
        endpoints: {
          'fixtures/get-fixture-by-id': ['participants', 'scores'],
          'standard-odds-feed/pre-match-odds/get-odds-by-fixture-id': ['market', 'bookmaker'],
          'predictions/get-probabilities-by-fixture-id': ['type']
        }
      },
      read('../docs/sportmonks-capabilities.json')
    )

    for (const id of ['fixtures:odds', 'fixtures:predictions']) {
      expect(result.capabilities.get(id).sources.length, id).toBeGreaterThan(0)
    }
    for (const id of [
      'fixtures:premiumOdds',
      'fixtures:inplayOdds',
      'live-predictions',
      'player-xg',
      'coaches:statistics',
      'teams:sidelinedHistory',
      'venues:fixtures'
    ]) {
      expect(result.capabilities.get(id).sources, id).toEqual([])
    }
  })
})
