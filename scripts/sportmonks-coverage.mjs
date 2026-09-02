import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(repositoryRoot, 'docs/sportmonks-api.json')
const coveragePath = join(repositoryRoot, 'docs/sportmonks-coverage.json')
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
  const result = calculateCoverage(catalog, coverage)
  const generatedFiles = new Map([
    [reportPath, renderReport(catalog, result)],
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
    `Sportmonks coverage: ${result.percentage}% (${result.coveredEndpoints}/${result.totalEndpoints} endpoints, ${result.coveredIncludes}/${result.totalIncludes} includes)`
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

export function calculateCoverage(catalog, coverage) {
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
  const totalCapabilities = totalEndpoints + totalIncludes
  const coveredCapabilities = coveredEndpoints + coveredIncludes
  const percentage =
    totalCapabilities === 0 ? 0 : Math.round((coveredCapabilities / totalCapabilities) * 100)

  return {
    coveredById,
    coveredEndpoints,
    coveredIncludes,
    percentage,
    totalEndpoints,
    totalIncludes
  }
}

function renderBadge(result) {
  return {
    schemaVersion: 1,
    label: 'Sportmonks coverage',
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
    `Halfspace currently covers **${result.coveredEndpoints} of ${result.totalEndpoints} endpoints** and **${result.coveredIncludes} of ${result.totalIncludes} documented endpoint includes**.`,
    '',
    `Overall coverage: **${result.percentage}%**`,
    '',
    `Source: [Sportmonks Football API 3.0 documentation index](${catalog.source})`,
    '',
    'The [catalog snapshot](sportmonks-api.json) lists every endpoint and supported top-level include in the Football API documentation, including odds. Other Sportmonks APIs and all possible nested include combinations are outside this count.',
    '',
    'Coverage means the endpoint or include is fetched, cached locally, reachable in the interface, and presented in its football context. Nested includes count through their documented top-level include.',
    '',
    'The percentage counts one unit per endpoint and per endpoint/include pair. It tracks reviewed product coverage, not automated proof of UI completeness or subscription access. Declarations live in `docs/sportmonks-coverage.json`.',
    '',
    'Update the declarations as features ship, then run `pnpm coverage` to regenerate the report and badge. Run `pnpm coverage:refresh` to download the latest catalog from the public documentation; no API token is needed. `pnpm coverage:check` validates declarations and generated files offline and is part of `pnpm check`.',
    '',
    'The README badge reads the generated JSON from the default branch on GitHub and updates after those changes are pushed.',
    '',
    '## Endpoints',
    ''
  ]

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
