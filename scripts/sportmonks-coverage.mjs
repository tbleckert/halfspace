import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(repositoryRoot, 'docs/sportmonks-api.json')
const coveragePath = join(repositoryRoot, 'docs/sportmonks-coverage.json')
const capabilitiesPath = join(repositoryRoot, 'docs/sportmonks-capabilities.json')
const reportPath = join(repositoryRoot, 'docs/sportmonks-coverage.md')
const badgePath = join(repositoryRoot, '.github/badges/sportmonks-coverage.json')
const endpointIndexUrl = 'https://docs.sportmonks.com/v3/sitemap.md'

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv[2] ?? 'check')
}

async function main(command) {
  if (!['check', 'update', 'refresh'].includes(command)) {
    throw new Error('Usage: node scripts/sportmonks-coverage.mjs [check|update|refresh]')
  }

  if (command === 'refresh') {
    const catalog = await fetchCatalog()
    await writeJson(catalogPath, catalog)
  }

  const catalog = await readJson(catalogPath)
  const coverage = await readJson(coveragePath)
  const capabilities = await readJson(capabilitiesPath)
  const result = calculateCoverage(catalog, coverage, capabilities)
  const generatedFiles = new Map([
    [reportPath, await format(renderReport(catalog, result), { filepath: reportPath })],
    [badgePath, `${JSON.stringify(renderBadge(result), null, 2)}\n`]
  ])

  if (command === 'check') {
    await checkGeneratedFiles(generatedFiles)
  } else {
    for (const [path, contents] of generatedFiles) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, contents)
    }
  }

  console.log(
    `Sportmonks data coverage: ${result.percentage}% (${result.coveredCapabilities}/${result.totalCapabilities} capabilities); endpoints: ${result.endpointPercentage}% (${result.coveredEndpoints}/${result.totalEndpoints})`
  )
}

async function fetchCatalog() {
  const index = await fetchMarkdown(endpointIndexUrl)
  const endpoints = parseEndpointIndex(index)

  console.log(`Refreshing ${endpoints.length} Sportmonks endpoint definitions...`)
  let completed = 0

  const detailedEndpoints = await mapWithConcurrency(endpoints, 8, async (endpoint) => {
    const markdown = await fetchMarkdown(`${endpoint.documentation}.md`)
    let details

    try {
      details = parseEndpointPage(markdown)
    } catch (error) {
      throw new Error(`Could not parse ${endpoint.documentation}: ${error.message}`, {
        cause: error
      })
    }

    completed += 1
    if (completed % 10 === 0 || completed === endpoints.length) {
      console.log(`Fetched ${completed}/${endpoints.length}`)
    }

    return { ...endpoint, ...details }
  })

  return {
    schemaVersion: 1,
    source: endpointIndexUrl,
    endpoints: detailedEndpoints
  }
}

export function parseEndpointIndex(markdown) {
  const endpoints = []
  const categories = new Map()
  const pages = [
    ...markdown.matchAll(
      /^- \[([^\]]+)]\((https:\/\/docs\.sportmonks\.com\/v3\/endpoints-and-entities\/endpoints\/[^)]+)\.md\)/gm
    )
  ]

  for (const [, label, documentation] of pages) {
    if (!/^GET /i.test(label)) categories.set(endpointId(documentation), label)
  }

  for (const [, label, documentation] of pages) {
    if (!/^GET /i.test(label)) continue

    const name = label.replace(/^GET /i, '')
    const id = endpointId(documentation)
    const segments = id.split('/').slice(0, -1)
    const category = segments
      .map((_, index) => categories.get(segments.slice(0, index + 1).join('/')))
      .filter(Boolean)
      .join(' / ')
    if (!category) throw new Error(`Endpoint has no category: ${documentation}`)

    endpoints.push({ id, category, method: 'GET', name, documentation })
  }

  if (endpoints.length === 0) throw new Error('No endpoints found in the Sportmonks index.')

  return endpoints
}

function endpointId(documentation) {
  return new URL(documentation).pathname.replace(/^\/v3\/endpoints-and-entities\/endpoints\//, '')
}

export function parseEndpointPage(markdown) {
  const routeMatch = markdown.match(/https:\/\/api\.sportmonks\.com(\/[^\s`<]+)/)
  if (!routeMatch) throw new Error('Endpoint page has no Sportmonks base URL.')

  const includeHeadings = [
    ...markdown.matchAll(
      /^(?:#{1,6}\s+)?\*{0,2}(Available Includes|Include options|Includes)\*{0,2}\s*$/gim
    )
  ]
  const includeHeading =
    includeHeadings.find((match) => match[1].toLowerCase() === 'available includes') ??
    includeHeadings[0]
  if (!includeHeading) throw new Error('Endpoint page has no include options section.')

  const sectionStart = includeHeading.index + includeHeading[0].length
  const section = markdown
    .slice(sectionStart)
    .trimStart()
    .split(/\n\s*\n/, 1)[0]
  const plainSection = decodeHtml(section)
    .replace(/[`*\u200B]/g, '')
    .trim()
  const unavailable =
    /^(?:none\b|n\/a\b|not applicable\b|using includes is.*disabled|no includes\b)/i.test(
      plainSection
    )
  const codeNames = [...section.matchAll(/`([^`]+)`|<code>([^<]+)<\/code>/g)].map(
    (match) => match[1] ?? match[2]
  )
  const names = unavailable ? [] : codeNames.length > 0 ? codeNames : [plainSection]
  const includes = []

  for (const name of names) {
    const include = decodeHtml(name)
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim()
      .split('.')[0]
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(include)) {
      throw new Error(`Unrecognized include list: ${section}`)
    }
    if (!includes.includes(include)) includes.push(include)
  }

  return {
    path: decodeHtml(routeMatch[1]).split('?')[0],
    includes
  }
}

export function calculateCoverage(catalog, coverage, model = { schemaVersion: 1 }) {
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.endpoints)) {
    throw new Error('Unsupported Sportmonks catalog format.')
  }
  if (coverage.schemaVersion !== 1 || typeof coverage.endpoints !== 'object') {
    throw new Error('Unsupported Sportmonks coverage format.')
  }

  const catalogById = new Map(catalog.endpoints.map((endpoint) => [endpoint.id, endpoint]))
  if (catalogById.size !== catalog.endpoints.length) {
    throw new Error('Duplicate endpoints found in the Sportmonks catalog.')
  }
  const coveredById = new Map()

  for (const [id, declaredIncludes] of Object.entries(coverage.endpoints)) {
    const endpoint = catalogById.get(id)
    if (!endpoint) throw new Error(`Unknown covered endpoint: ${id}`)
    if (!Array.isArray(declaredIncludes)) throw new Error(`Includes for ${id} must be an array.`)

    const uniqueIncludes = [...new Set(declaredIncludes)]
    if (uniqueIncludes.length !== declaredIncludes.length) {
      throw new Error(`Duplicate includes declared for ${id}.`)
    }

    for (const include of uniqueIncludes) {
      if (!endpoint.includes.includes(include)) {
        throw new Error(`Unknown include "${include}" for ${id}.`)
      }
    }

    coveredById.set(id, uniqueIncludes)
  }

  const totalEndpoints = catalog.endpoints.length
  const coveredEndpoints = coveredById.size
  const totalIncludes = catalog.endpoints.reduce(
    (total, endpoint) => total + endpoint.includes.length,
    0
  )
  const coveredIncludes = [...coveredById.values()].reduce(
    (total, includes) => total + includes.length,
    0
  )
  const capabilities = calculateCapabilities(catalogById, coveredById, coverage, model)
  const totalCapabilities = capabilities.size
  const coveredCapabilities = [...capabilities.values()].filter(
    (capability) => capability.sources.length > 0
  ).length

  return {
    coveredById,
    coveredEndpoints,
    coveredIncludes,
    capabilities,
    coveredCapabilities,
    totalCapabilities,
    percentage: percentageOf(coveredCapabilities, totalCapabilities),
    endpointPercentage: percentageOf(coveredEndpoints, totalEndpoints),
    totalEndpoints,
    totalIncludes
  }
}

function calculateCapabilities(catalogById, coveredById, coverage, model) {
  if (model.schemaVersion !== 1) throw new Error('Unsupported capability model format.')

  const groups = model.groups ?? {}
  const overrides = model.endpoints ?? {}
  const aliases = model.aliases ?? {}
  const endpointGroups = new Set(
    [...catalogById.keys()].map((id) => id.slice(0, id.lastIndexOf('/')))
  )
  for (const group of Object.keys(groups)) {
    if (!endpointGroups.has(group)) throw new Error(`Unknown capability endpoint group: ${group}`)
  }
  for (const id of Object.keys(overrides)) {
    if (!catalogById.has(id)) throw new Error(`Unknown capability endpoint: ${id}`)
  }

  const raw = new Map()
  function add(id, source) {
    const sources = raw.get(id) ?? []
    if (source) sources.push(source)
    raw.set(id, sources)
  }

  for (const endpoint of catalogById.values()) {
    const group = endpoint.id.slice(0, endpoint.id.lastIndexOf('/'))
    const mapping = overrides[endpoint.id] ?? groups[group] ?? { entity: group }
    const { entity, includeEntity = entity } = mapping
    if (!entity || !includeEntity || entity.includes(':') || includeEntity.includes(':')) {
      throw new Error(`Invalid capability entity for ${endpoint.id}`)
    }
    const supportedIncludes = coveredById.get(endpoint.id)
    add(entity, supportedIncludes ? { endpoint: endpoint.id } : null)
    for (const include of endpoint.includes) {
      add(
        `${includeEntity}:${include}`,
        supportedIncludes?.includes(include) ? { endpoint: endpoint.id, include } : null
      )
    }
  }

  // Aliases merge equivalent data, including uncovered data, before counting it.
  // Keep targets canonical so cycles and order-dependent chains cannot change the score.
  for (const [source, target] of Object.entries(aliases)) {
    if (!raw.has(source) || !raw.has(target)) {
      throw new Error(`Unknown capability alias: ${source} -> ${target}`)
    }
    if (Object.hasOwn(aliases, target)) {
      throw new Error(`Capability alias target must be canonical: ${source} -> ${target}`)
    }
  }

  const capabilities = new Map()
  for (const [id, sources] of raw) {
    const canonical = aliases[id] ?? id
    const capability = capabilities.get(canonical) ?? { id: canonical, sources: [] }
    capability.sources.push(...sources)
    capabilities.set(canonical, capability)
  }

  // A reviewed query can expose a relationship without requesting that include.
  // Every required endpoint/include must still be declared as supported.
  for (const [id, evidence] of Object.entries(coverage.equivalents ?? {})) {
    const capability = capabilities.get(id)
    if (!capability) throw new Error(`Unknown equivalent capability: ${id}`)
    const requirements = Object.entries(evidence.requires ?? {})
    if (!evidence.reason?.trim() || requirements.length === 0) {
      throw new Error(`Equivalent capability needs a reason and requirements: ${id}`)
    }
    for (const [endpointId, includes] of requirements) {
      const endpoint = catalogById.get(endpointId)
      if (!endpoint) throw new Error(`Unknown equivalent endpoint: ${endpointId}`)
      if (
        !Array.isArray(includes) ||
        includes.some((include) => !endpoint.includes.includes(include))
      ) {
        throw new Error(`Unknown equivalent include for ${endpointId}`)
      }
    }
    const supported = requirements.every(([endpointId, includes]) => {
      const declared = coveredById.get(endpointId)
      return declared && includes.every((include) => declared.includes(include))
    })
    if (supported) capability.sources.push({ equivalent: evidence })
  }

  return new Map([...capabilities.keys()].sort().map((id) => [id, capabilities.get(id)]))
}

function percentageOf(covered, total) {
  return total === 0 ? 0 : Math.round((covered / total) * 100)
}

function renderBadge(result) {
  return {
    schemaVersion: 1,
    label: 'Sportmonks data coverage',
    message: `${result.percentage}%`,
    color: badgeColor(result.percentage)
  }
}

function renderReport(catalog, result) {
  const categories = new Map()

  for (const endpoint of catalog.endpoints) {
    const category = categories.get(endpoint.category) ?? []
    category.push(endpoint)
    categories.set(endpoint.category, category)
  }

  const lines = [
    '# Sportmonks API coverage',
    '',
    `Data capability coverage: **${result.percentage}%** (${result.coveredCapabilities} of ${result.totalCapabilities} capabilities).`,
    '',
    `Endpoint coverage: **${result.endpointPercentage}%** (${result.coveredEndpoints} of ${result.totalEndpoints} endpoints).`,
    '',
    `Source: [Sportmonks Football API 3.0 documentation index](${catalog.source})`,
    '',
    'The [catalog snapshot](sportmonks-api.json) lists every endpoint and supported top-level include in the Football API documentation, including odds. Other Sportmonks APIs and all possible nested include combinations are outside this count.',
    '',
    'The badge counts each data type and each of its documented first-level relationships once, across all retrieval endpoints. Nested include combinations do not add units. Reviewed aliases merge equivalent data exposed through an include and a dedicated endpoint; other reviewed queries can also establish a relationship. Repeating the same data on a list, search, or detail endpoint earns no extra credit.',
    '',
    'Covered means the data is fetched, cached locally, reachable in the interface, and presented in its football context. This measures data breadth, not every possible field, statistic type, historical window, UI quality, or subscription entitlement. It is a reviewed declaration, not automated proof of product completeness. Unknown or unreviewed equivalences remain uncovered.',
    '',
    'The [capability model](sportmonks-capabilities.json) groups returned data types and merges equivalent capabilities independently of implementation status. The [product declarations](sportmonks-coverage.json) record supported endpoints/includes and evidence for equivalent queries. Pre-match and in-play feeds, team and player data, and current and historical odds remain distinct. Capability keys below identify a data type, optionally followed by `:include`.',
    '',
    'Endpoint coverage measures retrieval breadth separately. Its technical checklist retains exact endpoint/include counts, which do not contribute to the badge.',
    '',
    'Update the declarations as features ship, then run `pnpm coverage` to regenerate the report and badge. Run `pnpm coverage:refresh` to download the latest catalog from the public documentation; no API token is needed. `pnpm coverage:check` validates declarations and generated files offline and is part of `pnpm check`.',
    '',
    'The README badge reads the generated JSON from the default branch on GitHub and updates after those changes are pushed.',
    '',
    '## Data capabilities',
    '',
    'Every denominator unit is listed below. A supported capability shows one sufficient access path; other supported paths do not increase its weight. Query equivalences require all listed endpoint/include declarations to remain supported.',
    '',
    '| Capability | Supported through |',
    '| --- | --- |'
  ]

  for (const capability of result.capabilities.values()) {
    const source = capability.sources[0]
    let evidence = 'Not declared'
    if (source?.equivalent) {
      const endpoints = Object.entries(source.equivalent.requires).map(([id, includes]) =>
        endpointSource(catalog, id, includes)
      )
      evidence = `${source.equivalent.reason} ${endpoints.join('; ')}.`
    } else if (source) {
      evidence = endpointSource(catalog, source.endpoint, source.include ? [source.include] : [])
    }
    lines.push(`| ${source ? '✓' : '—'} \`${capability.id}\` | ${evidence} |`)
  }

  lines.push(
    '',
    '## Endpoint access paths',
    '',
    `Implemented: **${result.coveredEndpoints}/${result.totalEndpoints} endpoints** and **${result.coveredIncludes}/${result.totalIncludes} endpoint/include pairs**. These counts intentionally retain alternative routes to the same data.`,
    ''
  )

  for (const [category, endpoints] of categories) {
    lines.push(`### ${category}`, '')

    for (const endpoint of endpoints) {
      const coveredIncludes = result.coveredById.get(endpoint.id)
      const marker = coveredIncludes ? 'x' : ' '
      const includeSummary = coveredIncludes
        ? ` — includes ${coveredIncludes.length}/${endpoint.includes.length}`
        : ''
      lines.push(`- [${marker}] [${endpoint.name}](${endpoint.documentation})${includeSummary}`)
    }

    lines.push('')
  }

  return `${lines.join('\n').trim()}\n`
}

function endpointSource(catalog, id, includes) {
  const endpoint = catalog.endpoints.find((entry) => entry.id === id)
  const suffix = includes.length
    ? ` with ${includes.map((include) => `\`${include}\``).join(', ')}`
    : ''
  return `[${endpoint.name}](${endpoint.documentation})${suffix}`
}

async function checkGeneratedFiles(files) {
  const stale = []

  for (const [path, expected] of files) {
    let current

    try {
      current = await readFile(path, 'utf8')
    } catch {
      stale.push(path)
      continue
    }

    if (current !== expected) stale.push(path)
  }

  if (stale.length > 0) {
    const relativePaths = stale.map((path) => path.replace(`${repositoryRoot}/`, ''))
    throw new Error(
      `Generated coverage files are stale: ${relativePaths.join(', ')}. Run pnpm coverage.`
    )
  }
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await task(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}

async function fetchMarkdown(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/markdown',
      'User-Agent': 'Halfspace Sportmonks coverage tracker'
    },
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status}`)

  return response.text()
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  const contents = await format(JSON.stringify(value), {
    ...(await resolveConfig(path)),
    filepath: path
  })
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

function decodeHtml(value) {
  return value
    .replaceAll('&#x26;', '&')
    .replaceAll('&amp;', '&')
    .replaceAll('&#x20;', ' ')
    .replaceAll('&nbsp;', ' ')
}

function badgeColor(percentage) {
  if (percentage >= 100) return 'brightgreen'
  if (percentage >= 75) return 'green'
  if (percentage >= 50) return 'yellowgreen'
  if (percentage >= 25) return 'yellow'
  return 'orange'
}
