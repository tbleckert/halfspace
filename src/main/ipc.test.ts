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
  fetchLiveFixtures: vi.fn(),
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
  fetchLiveFixtures: sportmonksMocks.fetchLiveFixtures,
  fetchFixturesByDate: sportmonksMocks.fetchFixturesByDate,
  fetchFixturesByDateRange: sportmonksMocks.fetchFixturesByDateRange
}))

import { registerIpcHandlers } from './ipc'
import { SportmonksError } from './sportmonks-client'

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

  it('validates and forwards in-play livescore requests', async () => {
    const refresh = { fixtures: [] }
    sportmonksMocks.fetchLiveFixtures.mockResolvedValue(refresh)

    const input = { timeZone: 'Europe/Stockholm' }
    const result = await invokeTrusted(ipcChannels.refreshLiveFixtures, input)

    expect(result).toEqual({ ok: true, data: refresh })
    expect(sportmonksMocks.fetchLiveFixtures).toHaveBeenCalledWith(input, 'private-token')
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

  it.each([ipcChannels.refreshFixtures, ipcChannels.refreshFixturePressure])(
    'rejects untrusted senders for %s outside the recoverable request boundary',
    async (channel) => {
      electronMocks.fromWebContents.mockReturnValue(null)
      const handler = electronMocks.handlers.get(channel)

      await expect(
        handler?.(
          { sender: {}, senderFrame: {} },
          { date: '2026-08-31', timeZone: 'Europe/Stockholm' }
        )
      ).rejects.toThrow('Rejected IPC call from an untrusted sender.')
    }
  )

  it('validates pressure fixture IDs before reading credentials', async () => {
    const result = await invokeTrusted(ipcChannels.refreshFixturePressure, { fixtureId: -1 })
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid_input' } })
    expect(tokenMocks.readStoredToken).not.toHaveBeenCalled()
  })

  it.each([ipcChannels.saveToken, ipcChannels.clearToken])(
    'clears the rate-limit notice after %s',
    async (channel) => {
      const rateLimit = { remaining: 0, resetsAt: Date.now() + 60_000, requestedEntity: 'Fixture' }
      sportmonksMocks.fetchFixturesByDate.mockRejectedValue(
        new SportmonksError('rate_limited', 'Limit reached.', rateLimit)
      )
      await invokeTrusted(ipcChannels.refreshFixtures, { date: '2026-09-03', timeZone: 'UTC' })
      expect(await invokeTrusted(ipcChannels.rateLimitState)).toEqual(rateLimit)

      await invokeTrusted(channel, { token: 'replacement-token' })
      expect(await invokeTrusted(ipcChannels.rateLimitState)).toBeNull()
      expect(electronMocks.send).toHaveBeenLastCalledWith(ipcChannels.rateLimitChanged, null)
    }
  )

  it('does not publish a previous token’s in-flight rate limit after credentials change', async () => {
    let rejectRequest!: (error: Error) => void
    sportmonksMocks.fetchFixturesByDate.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        })
    )
    const request = invokeTrusted(ipcChannels.refreshFixtures, {
      date: '2026-09-03',
      timeZone: 'UTC'
    })
    await vi.waitFor(() => expect(rejectRequest).toBeDefined())
    await invokeTrusted(ipcChannels.saveToken, { token: 'replacement-token' })
    electronMocks.send.mockClear()
    rejectRequest(
      new SportmonksError('rate_limited', 'Limit reached.', {
        remaining: 0,
        resetsAt: Date.now() + 60_000
      })
    )

    await expect(request).resolves.toMatchObject({ ok: false })
    expect(await invokeTrusted(ipcChannels.rateLimitState)).toBeNull()
    expect(electronMocks.send).not.toHaveBeenCalled()
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
