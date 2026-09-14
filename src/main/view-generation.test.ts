import { beforeEach, expect, it, vi } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'
import { simulateReadableStream } from 'ai'
import type { GenerateViewInput, ViewProgress } from '@shared/views'

const provider = vi.hoisted(() => ({ responses: vi.fn() }))
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: () => provider }))
import { generateView } from './view-generation'

const block = {
  id: 'table',
  type: 'standings',
  teamId: null,
  competitionId: 8,
  seasonId: 12,
  span: 1
}
const spec = { version: 3, title: 'Premier League', message: 'Your league table.', blocks: [block] }
const input: GenerateViewInput = {
  research: { fixtures: [], statistics: [], markets: [], bookmakers: [] },
  countries: [],
  requestId: 'fa3197ee-c3b7-4a09-81d8-aa11a133ab66',
  prompt: 'Show a league table',
  teams: [],
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

function streamingModel(text: string, outcome = 'composed'): MockLanguageModelV4 {
  text = `{"outcome":"${outcome}",${text.slice(1)}`
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: null,
        chunkDelayInMs: null,
        chunks: [
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 'view' },
          ...text
            .match(/.{1,25}/gs)!
            .map((delta) => ({ type: 'text-delta' as const, id: 'view', delta })),
          { type: 'text-end', id: 'view' },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: 'stop' },
            usage: {
              inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 100, text: 100, reasoning: 0 }
            }
          }
        ]
      })
    })
  })
}

beforeEach(() => vi.clearAllMocks())

it('streams validated blocks through AI SDK and returns the complete definition', async () => {
  const model = streamingModel(JSON.stringify(spec))
  provider.responses.mockReturnValue(model)
  const updates: ViewProgress[] = []
  const result = await generateView(input, 'test-key', new AbortController().signal, (progress) =>
    updates.push(progress)
  )
  expect(result).toEqual(spec)
  expect(updates.some((update) => update.blocks.length === 1)).toBe(true)
  expect(updates.every((update) => update.requestId === input.requestId)).toBe(true)
  expect(model.doStreamCalls[0].providerOptions?.openai?.store).toBe(false)
  expect(JSON.stringify(model.doStreamCalls[0].prompt)).not.toContain('test-key')
})

it('never forwards invented identities from otherwise valid model output', async () => {
  provider.responses.mockReturnValue(
    streamingModel(JSON.stringify({ ...spec, blocks: [{ ...block, seasonId: 999 }] }))
  )
  const updates: ViewProgress[] = []
  await expect(
    generateView(input, 'test-key', new AbortController().signal, (progress) =>
      updates.push(progress)
    )
  ).rejects.toThrow(/season/i)
  expect(updates.flatMap((update) => update.blocks)).toEqual([])
})

it('rejects truncated output instead of accepting a partial view', async () => {
  provider.responses.mockReturnValue(streamingModel(JSON.stringify(spec).slice(0, -25)))
  await expect(
    generateView(input, 'test-key', new AbortController().signal, () => undefined)
  ).rejects.toThrow()
})

it('rejects invented team identities before streaming them to the canvas', async () => {
  provider.responses.mockReturnValue(
    streamingModel(
      JSON.stringify({
        ...spec,
        blocks: [{ id: 'next', type: 'team-next-match', teamId: 999, span: 2 }]
      })
    )
  )
  const updates: ViewProgress[] = []
  await expect(
    generateView(
      { ...input, teams: [{ teamId: 19, teamName: 'Arsenal' }] },
      'test-key',
      new AbortController().signal,
      (progress) => updates.push(progress)
    )
  ).rejects.toThrow(/team/i)
  expect(updates.flatMap((update) => update.blocks)).toEqual([])
})

it('does not stream or return fallback widgets when an essential request is unavailable', async () => {
  const declined = { ...spec, message: 'Transfer news is not available in Views yet.' }
  provider.responses.mockReturnValue(streamingModel(JSON.stringify(declined), 'unavailable'))
  const updates: ViewProgress[] = []
  const result = await generateView(input, 'test-key', new AbortController().signal, (progress) =>
    updates.push(progress)
  )
  expect(result).toEqual({ ...declined, blocks: [] })
  expect(updates.flatMap((update) => update.blocks)).toEqual([])
})

it('does not return a completed view after cancellation', async () => {
  provider.responses.mockReturnValue(streamingModel(JSON.stringify(spec)))
  const controller = new AbortController()
  await expect(
    generateView(input, 'test-key', controller.signal, () => controller.abort())
  ).rejects.toThrow()
})

it('waits for a valid referenced next match before streaming broadcasts', async () => {
  const tv = {
    id: 'tv',
    type: 'fixture-broadcasts',
    fixtureSourceBlockId: 'next',
    countryId: 47,
    span: 1
  }
  const next = { id: 'next', type: 'team-next-match', teamId: 19, span: 2 }
  const definition = { ...spec, blocks: [tv, next] }
  provider.responses.mockReturnValue(streamingModel(JSON.stringify(definition)))
  const updates: ViewProgress[] = []
  await expect(
    generateView(
      {
        ...input,
        teams: [{ teamId: 19, teamName: 'Arsenal' }],
        countries: [{ countryId: 47, countryName: 'Sweden' }]
      },
      'test-key',
      new AbortController().signal,
      (progress) => updates.push(progress)
    )
  ).resolves.toEqual(definition)
  expect(updates.some(({ blocks }) => blocks.length === 2)).toBe(true)
  expect(
    updates.every(
      ({ blocks }) =>
        !blocks.some((block) => block.id === 'tv') || blocks.some((block) => block.id === 'next')
    )
  ).toBe(true)
})

it.each(['country', 'source'] as const)(
  'never streams broadcasts with an unknown %s',
  async (invalid) => {
    const definition = {
      ...spec,
      blocks: [
        { id: 'next', type: 'team-next-match', teamId: 19, span: 2 },
        {
          id: 'tv',
          type: 'fixture-broadcasts',
          fixtureSourceBlockId: invalid === 'source' ? 'missing' : 'next',
          countryId: 999,
          span: 1
        }
      ]
    }
    provider.responses.mockReturnValue(streamingModel(JSON.stringify(definition)))
    const updates: ViewProgress[] = []
    await expect(
      generateView(
        { ...input, teams: [{ teamId: 19, teamName: 'Arsenal' }] },
        'test-key',
        new AbortController().signal,
        (progress) => updates.push(progress)
      )
    ).rejects.toThrow()
    expect(
      updates.flatMap(({ blocks }) => blocks).every((block) => block.type !== 'fixture-broadcasts')
    ).toBe(true)
  }
)

it('never streams a player comparison with an invented club-season binding', async () => {
  const selection = { playerId: 100, teamId: 19, competitionId: 8, seasonId: 12 }
  const definition = {
    ...spec,
    blocks: [
      {
        id: 'players',
        type: 'player-comparison',
        span: 2,
        left: selection,
        right: { ...selection, teamId: 99 }
      }
    ]
  }
  provider.responses.mockReturnValue(streamingModel(JSON.stringify(definition)))
  const updates: ViewProgress[] = []
  await expect(
    generateView(
      {
        ...input,
        research: {
          ...input.research,
          fixtures: [],
          statistics: [
            {
              kind: 'players',
              entityId: 100,
              entityName: 'Player',
              teamId: 19,
              teamName: 'Arsenal',
              competitionId: 8,
              competitionName: 'League',
              seasonId: 12,
              seasonName: 'Season'
            }
          ]
        }
      },
      'test-key',
      new AbortController().signal,
      (progress) => updates.push(progress)
    )
  ).rejects.toThrow(/statistics selection/)
  expect(updates.flatMap(({ blocks }) => blocks)).toEqual([])
})
