// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { mockViewsApi } from '../../../../test/view-api'
import type { Result } from '@shared/contracts'
import type { GenerateViewInput, ViewProgress, ViewSpec } from '@shared/views'
import { useViewGeneration } from './use-view-generation'

const spec: ViewSpec = {
  version: 1,
  title: 'Premier League',
  message: '',
  blocks: [{ id: 'table', type: 'standings', competitionId: 8, seasonId: 12, span: 'half' }]
}
const contexts = [
  {
    competitionId: 8,
    competitionName: 'Premier League',
    seasonId: 12,
    seasonName: '2026/27',
    isCurrent: true
  }
]
let progress: (update: ViewProgress) => void
let input: GenerateViewInput
let complete: (result: Result<ViewSpec>) => void

beforeEach(() => {
  const views = mockViewsApi()
  views.onProgress = (listener) => {
    progress = listener
    return vi.fn()
  }
  views.generate = vi.fn((value: GenerateViewInput) => {
    input = value
    return new Promise<Result<ViewSpec>>((resolve) => {
      complete = resolve
    })
  })
  window.halfspace = { views } as typeof window.halfspace
})

it('ignores late progress and completion after the user stops generation', async () => {
  const { result } = renderHook(useViewGeneration)
  let task: Promise<ViewSpec | null>
  act(() => {
    task = result.current.generate('Show a table', contexts, spec)
  })
  act(() => progress({ requestId: input.requestId, blocks: spec.blocks }))
  expect(result.current.blocks).toHaveLength(1)
  act(() => result.current.cancel())
  act(() => progress({ requestId: input.requestId, blocks: spec.blocks }))
  await act(async () => {
    complete({ ok: true, data: spec })
    expect(await task!).toBeNull()
  })
  expect(result.current.blocks).toEqual([])
  expect(result.current.generating).toBe(false)
  expect(window.halfspace.views.cancel).toHaveBeenCalledWith(input.requestId)
})

it('preserves the previous view when an edit is unsupported', async () => {
  const { result } = renderHook(useViewGeneration)
  let task: Promise<ViewSpec | null>
  act(() => {
    task = result.current.generate('Add a custom radar', contexts, spec)
  })
  await act(async () => {
    complete({
      ok: true,
      data: { ...spec, blocks: [], message: 'Custom radars are not available yet.' }
    })
    expect(await task!).toBeNull()
  })
  expect(result.current.error).toBe('Custom radars are not available yet.')
  expect(input.current).toEqual(spec)
})

it('cancels the main-process request when the editor unmounts', () => {
  const { result, unmount } = renderHook(useViewGeneration)
  act(() => {
    void result.current.generate('Show a table', contexts, null)
  })
  unmount()
  expect(window.halfspace.views.cancel).toHaveBeenCalledWith(input.requestId)
})
