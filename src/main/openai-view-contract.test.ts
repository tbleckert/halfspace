import { afterEach, expect, it, vi } from 'vitest'
import { generateView, generationErrorMessage } from './view-generation'
import type { GenerateViewInput } from '@shared/views'
import { implementedViewWidgets } from '@shared/view-widgets'

const input: GenerateViewInput = {
  research: {
    statistics: [
      ...[100, 101].map((entityId) => ({
        kind: 'players' as const,
        entityId,
        entityName: `Player ${entityId}`,
        teamId: 19,
        teamName: 'Arsenal',
        competitionId: 8,
        competitionName: 'Premier League',
        seasonId: 12,
        seasonName: '2026/27'
      })),
      ...[19, 20].map((entityId) => ({
        kind: 'teams' as const,
        entityId,
        entityName: `Team ${entityId}`,
        teamId: entityId,
        teamName: `Team ${entityId}`,
        competitionId: 8,
        competitionName: 'Premier League',
        seasonId: 12,
        seasonName: '2026/27'
      }))
    ],
    markets: [{ id: 1, name: 'Match winner' }],
    bookmakers: []
  },
  countries: [{ countryId: 47, countryName: 'Sweden' }],
  requestId: 'fa3197ee-c3b7-4a09-81d8-aa11a133ab66',
  prompt: 'Show the league table',
  teams: [{ teamId: 19, teamName: 'Arsenal' }],
  contexts: [
    {
      competitionId: 8,
      competitionName: 'Premier League',
      seasonId: 12,
      seasonName: '2026/27',
      isCurrent: true
    }
  ],
  current: null
}
const spec = {
  version: 2,
  title: 'My league',
  message: '',
  blocks: [
    { id: 'table', type: 'standings', teamId: null, competitionId: 8, seasonId: 12, span: 1 }
  ]
}
afterEach(() => vi.unstubAllGlobals())
const firstPlayer = { playerId: 100, teamId: 19, competitionId: 8, seasonId: 12 }
const firstTeam = { teamId: 19, competitionId: 8, seasonId: 12, matchLocation: 'all' }

it.each([
  spec,
  {
    version: 2,
    title: 'Home form',
    message: '',
    blocks: [{ id: 'trend', type: 'form-trend', teamId: 19, span: 2, matchLocation: 'home' }]
  },
  {
    version: 2,
    title: 'Where to watch',
    message: '',
    blocks: [
      { id: 'next', type: 'team-next-match', teamId: 19, span: 2 },
      { id: 'tv', type: 'fixture-broadcasts', nextMatchBlockId: 'next', countryId: 47, span: 1 }
    ]
  },
  {
    version: 2,
    title: 'Five-widget study',
    message: '',
    blocks: [
      { id: 'next', type: 'team-next-match', teamId: 19, span: 2 },
      { id: 'news', type: 'team-news', teamId: 19, span: 1 },
      { id: 'profile', type: 'player-profile', selection: firstPlayer, span: 1 },
      {
        id: 'players',
        type: 'player-comparison',
        left: firstPlayer,
        right: { ...firstPlayer, playerId: 101 },
        span: 3
      },
      {
        id: 'teams',
        type: 'team-comparison',
        left: firstTeam,
        right: { ...firstTeam, teamId: 20, matchLocation: 'away' },
        span: 2
      },
      {
        id: 'odds',
        type: 'odds-comparison',
        nextMatchBlockId: 'next',
        marketId: 1,
        bookmakerId: null,
        span: 1
      }
    ]
  }
])(
  'uses the direct OpenAI Responses endpoint with a strict schema and streams $title',
  async (definition) => {
    const events = [
      {
        type: 'response.created',
        response: { id: 'resp_1', created_at: 1, model: 'gpt-5.4-mini' }
      },
      {
        type: 'response.output_item.added',
        output_index: 0,
        item: { type: 'message', id: 'msg_1' }
      },
      {
        type: 'response.output_text.delta',
        item_id: 'msg_1',
        output_index: 0,
        delta: JSON.stringify({ outcome: 'composed', ...definition })
      },
      {
        type: 'response.output_item.done',
        output_index: 0,
        item: { type: 'message', id: 'msg_1' }
      },
      { type: 'response.completed', response: { usage: { input_tokens: 10, output_tokens: 100 } } }
    ]
    const response = new Response(
      events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''),
      {
        headers: { 'Content-Type': 'text/event-stream' }
      }
    )
    const fetch = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetch)
    const progress = vi.fn()
    expect(await generateView(input, 'test-key', new AbortController().signal, progress)).toEqual(
      definition
    )
    const [url, request] = fetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    const body = JSON.parse(request.body)
    expect(body.store).toBe(false)
    expect(body.stream).toBe(true)
    expect(body.text.format).toMatchObject({
      type: 'json_schema',
      strict: true,
      schema: { additionalProperties: false }
    })
    // OpenAI rejects oneOf from Zod discriminated unions before generation starts.
    const blockAlternatives = body.text.format.schema.properties.blocks.items
    expect(Object.keys(body.text.format.schema.properties)[0]).toBe('outcome')
    expect(blockAlternatives).toHaveProperty('anyOf')
    expect(blockAlternatives).not.toHaveProperty('oneOf')
    // Choosing type first avoids committing to overlapping entity fields before the widget kind.
    expect(blockAlternatives.anyOf.map((option) => option.properties.type.const).sort()).toEqual(
      implementedViewWidgets.map(({ type }) => type).sort()
    )
    for (const option of blockAlternatives.anyOf) {
      expect(Object.keys(option.properties)[0]).toBe('type')
      expect(option.required).toEqual(Object.keys(option.properties))
      expect(option.additionalProperties).toBe(false)
    }
    expect(body.input).toBeDefined()
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ blocks: definition.blocks }))
  }
)

it('reports rejected credentials without echoing provider error content', async () => {
  const response = new Response(
    JSON.stringify({
      error: {
        message: 'Invalid test-secret-key',
        type: 'invalid_request_error',
        code: 'invalid_api_key'
      }
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  let failure: unknown
  try {
    await generateView(input, 'test-key', new AbortController().signal, () => undefined)
  } catch (error) {
    failure = error
  }
  expect(failure).toBeDefined()
  expect(generationErrorMessage(failure)).toBe('OpenAI rejected the key. Replace it in Settings.')
})
