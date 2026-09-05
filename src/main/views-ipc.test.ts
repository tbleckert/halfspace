import { EventEmitter } from 'node:events'
import { beforeEach, expect, it, vi } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import { ipcChannels } from '@shared/contracts'
import type { GenerateViewInput, ViewProgress } from '@shared/views'

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, input?: unknown) => unknown>(),
  fromWebContents: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
  generate: vi.fn()
}))
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, input?: unknown) => unknown) =>
      mocks.handlers.set(channel, handler)
  },
  BrowserWindow: { fromWebContents: mocks.fromWebContents }
}))
vi.mock('./ai-key-store', () => ({
  readAiKey: mocks.read,
  saveAiKey: mocks.save,
  clearAiKey: mocks.clear
}))
vi.mock('./view-generation', () => ({
  generateView: mocks.generate,
  generationErrorMessage: () => 'Generation failed.'
}))
import { registerViewsIpc, cancelViewGenerations } from './views-ipc'

const input: GenerateViewInput = {
  requestId: 'fa3197ee-c3b7-4a09-81d8-aa11a133ab66',
  prompt: 'A league table',
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

function owner(id = 1): { event: IpcMainInvokeEvent; send: ReturnType<typeof vi.fn> } {
  const sender = Object.assign(new EventEmitter(), {
    id,
    isDestroyed: () => false,
    mainFrame: {},
    send: vi.fn()
  })
  mocks.fromWebContents.mockImplementation((contents) => ({ webContents: contents }))
  return {
    event: { sender, senderFrame: sender.mainFrame } as unknown as IpcMainInvokeEvent,
    send: sender.send
  }
}

beforeEach(() => {
  cancelViewGenerations()
  vi.clearAllMocks()
  mocks.handlers.clear()
  mocks.read.mockResolvedValue('secret-key')
  mocks.save.mockResolvedValue(undefined)
  mocks.clear.mockResolvedValue(undefined)
  registerViewsIpc()
})

it('never returns the key to the renderer and rejects untrusted calls before reading it', async () => {
  const { event } = owner()
  expect(await mocks.handlers.get(ipcChannels.aiSettings)!(event)).toEqual({
    ok: true,
    data: { configured: true }
  })
  mocks.read.mockClear()
  await expect(
    mocks.handlers.get(ipcChannels.aiSettings)!({ ...event, senderFrame: {} })
  ).rejects.toThrow(/untrusted/)
  expect(mocks.read).not.toHaveBeenCalled()
})

it('rejects invalid generation input before using credentials or making a model call', async () => {
  const { event } = owner()
  expect(
    await mocks.handlers.get(ipcChannels.viewGenerate)!(event, { ...input, contexts: [] })
  ).toMatchObject({ ok: false, error: { code: 'invalid_input' } })
  expect(mocks.read).not.toHaveBeenCalled()
  expect(mocks.generate).not.toHaveBeenCalled()
})

it('aborts generation on key replacement and suppresses late progress and results', async () => {
  const { event, send } = owner()
  let resolve!: (value: unknown) => void
  let signal!: AbortSignal
  let progress!: (value: ViewProgress) => void
  mocks.generate.mockImplementation((_input, _key, abortSignal, onProgress) => {
    signal = abortSignal
    progress = onProgress
    return new Promise((done) => {
      resolve = done
    })
  })
  const pending = mocks.handlers.get(ipcChannels.viewGenerate)!(event, input)
  await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce())
  expect(
    await mocks.handlers.get(ipcChannels.aiSaveKey)!(event, { key: 'replacement-key' })
  ).toEqual({ ok: true, data: null })
  expect(signal.aborted).toBe(true)
  progress({ requestId: input.requestId, blocks: [] })
  resolve(spec)
  expect(await pending).toMatchObject({ ok: false })
  expect(send).not.toHaveBeenCalled()
})

it('does not let a different window cancel a request and removes its destroyed listener', async () => {
  const first = owner(1),
    second = owner(2)
  let resolve!: (value: unknown) => void
  let signal!: AbortSignal
  mocks.generate.mockImplementation((_input, _key, abortSignal) => {
    signal = abortSignal
    return new Promise((done) => {
      resolve = done
    })
  })
  const pending = mocks.handlers.get(ipcChannels.viewGenerate)!(first.event, input)
  await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce())
  await mocks.handlers.get(ipcChannels.viewCancel)!(second.event, input.requestId)
  expect(signal.aborted).toBe(false)
  resolve(spec)
  expect(await pending).toEqual({ ok: true, data: spec })
  expect(first.event.sender.listenerCount('destroyed')).toBe(0)
})
