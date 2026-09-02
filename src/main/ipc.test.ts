import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcChannels } from '@shared/contracts'

type IpcHandler = (event: unknown, input?: unknown) => unknown

const electronMocks = vi.hoisted(() => ({
  fromWebContents: vi.fn(),
  handlers: new Map<string, IpcHandler>(),
  send: vi.fn()
}))

const tokenMocks = vi.hoisted(() => ({
  clearStoredToken: vi.fn(),
  hasStoredToken: vi.fn(),
  readStoredToken: vi.fn(),
  saveStoredToken: vi.fn()
}))

const sportmonksMocks = vi.hoisted(() => ({
  fetchFixturesByDate: vi.fn(),
  fetchFixturesByDateRange: vi.fn()
}))

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: electronMocks.fromWebContents,
    getAllWindows: () => [{ webContents: { send: electronMocks.send } }]
  },
  ipcMain: {
    handle: (channel: string, handler: IpcHandler) => electronMocks.handlers.set(channel, handler)
  }
}))

vi.mock('./token-store', () => tokenMocks)

vi.mock('./sportmonks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./sportmonks')>()),
  fetchFixturesByDate: sportmonksMocks.fetchFixturesByDate,
  fetchFixturesByDateRange: sportmonksMocks.fetchFixturesByDateRange
}))

import { registerIpcHandlers } from './ipc'

describe('IPC handlers', () => {
  beforeEach(() => {
    electronMocks.handlers.clear()
    vi.clearAllMocks()
    tokenMocks.readStoredToken.mockResolvedValue('private-token')
    registerIpcHandlers()
  })

  it('validates input and passes the stored token to Sportmonks requests', async () => {
    const refresh = { fixtures: [] }
    sportmonksMocks.fetchFixturesByDate.mockResolvedValue(refresh)

    const result = await invokeTrusted(ipcChannels.refreshFixtures, {
      date: '2026-08-31',
      timeZone: 'Europe/Stockholm'
    })

    expect(result).toEqual({ ok: true, data: refresh })
    expect(sportmonksMocks.fetchFixturesByDate).toHaveBeenCalledWith(
      { date: '2026-08-31', timeZone: 'Europe/Stockholm' },
      'private-token'
    )
  })

  it('returns the shared missing-token result before making a request', async () => {
    tokenMocks.readStoredToken.mockResolvedValue(null)

    const result = await invokeTrusted(ipcChannels.refreshFixtures, {
      date: '2026-08-31',
      timeZone: 'Europe/Stockholm'
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'missing_token',
        message: 'Add your Sportmonks token in Settings.',
        rateLimit: undefined
      }
    })
    expect(sportmonksMocks.fetchFixturesByDate).not.toHaveBeenCalled()
  })

  it('validates and forwards rolling fixture-window requests', async () => {
    const refresh = { fixtures: [] }
    sportmonksMocks.fetchFixturesByDateRange.mockResolvedValue(refresh)

    const input = {
      startDate: '2026-08-30',
      endDate: '2026-09-09',
      timeZone: 'Europe/Stockholm'
    }
    const result = await invokeTrusted(ipcChannels.refreshFixtureWindow, input)

    expect(result).toEqual({ ok: true, data: refresh })
    expect(sportmonksMocks.fetchFixturesByDateRange).toHaveBeenCalledWith(input, 'private-token')
  })

  it('rejects untrusted senders outside the recoverable request boundary', async () => {
    electronMocks.fromWebContents.mockReturnValue(null)
    const handler = electronMocks.handlers.get(ipcChannels.refreshFixtures)

    await expect(
      handler?.(
        { sender: {}, senderFrame: {} },
        { date: '2026-08-31', timeZone: 'Europe/Stockholm' }
      )
    ).rejects.toThrow('Rejected IPC call from an untrusted sender.')
  })
})

async function invokeTrusted(channel: string, input?: unknown): Promise<unknown> {
  const mainFrame = {}
  const sender = {}
  electronMocks.fromWebContents.mockReturnValue({ webContents: { mainFrame } })

  const handler = electronMocks.handlers.get(channel)
  if (!handler) throw new Error(`No handler registered for ${channel}.`)

  return handler({ sender, senderFrame: mainFrame }, input)
}
