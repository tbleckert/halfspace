import { afterEach, expect, it, vi } from 'vitest'
import { generateView, generationErrorMessage } from './view-generation'
import type { GenerateViewInput } from '@shared/views'

const input: GenerateViewInput = {
  requestId: 'fa3197ee-c3b7-4a09-81d8-aa11a133ab66',
  prompt: 'Show the league table',
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
  version: 1,
  title: 'My league',
  message: '',
  blocks: [{ id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'half' }]
}
afterEach(() => vi.unstubAllGlobals())

it('uses the direct OpenAI Responses endpoint with a strict schema and streams its response', async () => {
  const events = [
    { type: 'response.created', response: { id: 'resp_1', created_at: 1, model: 'gpt-5.4-mini' } },
    { type: 'response.output_item.added', output_index: 0, item: { type: 'message', id: 'msg_1' } },
    {
      type: 'response.output_text.delta',
      item_id: 'msg_1',
      output_index: 0,
      delta: JSON.stringify(spec)
    },
    { type: 'response.output_item.done', output_index: 0, item: { type: 'message', id: 'msg_1' } },
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
    spec
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
  expect(blockAlternatives).toHaveProperty('anyOf')
  expect(blockAlternatives).not.toHaveProperty('oneOf')
  expect(body.input).toBeDefined()
  expect(progress).toHaveBeenCalledWith(expect.objectContaining({ blocks: spec.blocks }))
})

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
