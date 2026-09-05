import { beforeEach, expect, it, vi } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'
import { simulateReadableStream } from 'ai'
import type { GenerateViewInput, ViewProgress } from '@shared/views'

const provider = vi.hoisted(() => ({ responses: vi.fn() }))
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: () => provider }))
import { generateView } from './view-generation'

const block = { id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'half' }
const spec = { version: 1, title: 'Premier League', message: 'Your league table.', blocks: [block] }
const input: GenerateViewInput = {
  requestId: 'fa3197ee-c3b7-4a09-81d8-aa11a133ab66',
  prompt: 'Show a league table',
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

function streamingModel(text: string): MockLanguageModelV4 {
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

it('does not return a completed view after cancellation', async () => {
  provider.responses.mockReturnValue(streamingModel(JSON.stringify(spec)))
  const controller = new AbortController()
  await expect(
    generateView(input, 'test-key', controller.signal, () => controller.abort())
  ).rejects.toThrow()
})
