// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SportmonksRateLimit } from '@shared/contracts'
import * as cache from '@/data/db'
import { ConnectionStateProvider } from './connection-state-provider'
import { useConnectionState } from './use-connection-state'

let rateLimitListener: (rateLimit: SportmonksRateLimit | null) => void

beforeEach(() => {
  window.halfspace = {
    credentials: {
      getConnectionState: vi.fn().mockResolvedValue({ configured: true }),
      saveToken: vi.fn().mockResolvedValue({ ok: true, data: { configured: true } }),
      clearToken: vi.fn().mockResolvedValue({ ok: true, data: null })
    },
    sportmonks: {
      getRateLimit: vi.fn().mockResolvedValue(null),
      onRateLimitChange: vi.fn((listener) => {
        rateLimitListener = listener
        return () => {}
      })
    }
  } as unknown as typeof window.halfspace
})

afterEach(() => vi.restoreAllMocks())

describe('credential reset lifecycle', () => {
  it('gates the workspace until the previous cache has been cleared', async () => {
    const clearing = Promise.withResolvers<void>()
    const clearCache = vi.spyOn(cache, 'clearSportmonksCache').mockReturnValueOnce(clearing.promise)
    const { result } = renderHook(useConnectionState, { wrapper: ConnectionStateProvider })
    await waitFor(() => expect(result.current.connection?.configured).toBe(true))

    let saving: ReturnType<typeof result.current.saveToken>
    act(() => {
      saving = result.current.saveToken('replacement-token')
    })
    await waitFor(() => expect(clearCache).toHaveBeenCalledOnce())
    expect(result.current.connection).toBeNull()

    await act(async () => {
      clearing.resolve()
      await saving
    })
    expect(result.current.connection?.configured).toBe(true)
  })

  it.each(['save', 'clear'] as const)(
    'surfaces a failed cache reset after token %s and retries it before reopening',
    async (operation) => {
      const clearCache = vi
        .spyOn(cache, 'clearSportmonksCache')
        .mockRejectedValueOnce(new Error('IndexedDB unavailable'))
        .mockResolvedValueOnce(undefined)
      const { result } = renderHook(useConnectionState, { wrapper: ConnectionStateProvider })
      await waitFor(() => expect(result.current.connection?.configured).toBe(true))

      await act(async () => {
        const response =
          operation === 'save'
            ? await result.current.saveToken('replacement-token')
            : await result.current.clearToken()
        expect(response.ok).toBe(false)
      })
      expect(result.current.connection).toBeNull()
      expect(result.current.error).toContain('cached football data')
      vi.mocked(window.halfspace.credentials.getConnectionState).mockResolvedValue({
        configured: operation === 'save'
      })
      await act(() => result.current.reload())
      expect(clearCache).toHaveBeenCalledTimes(2)
      expect(result.current.connection?.configured).toBe(operation === 'save')
      expect(result.current.error).toBeNull()
    }
  )

  it('does not let an older rate-limit read overwrite a newer cleared notice', async () => {
    const snapshot = Promise.withResolvers<SportmonksRateLimit | null>()
    vi.mocked(window.halfspace.sportmonks.getRateLimit).mockReturnValueOnce(snapshot.promise)
    const { result } = renderHook(useConnectionState, { wrapper: ConnectionStateProvider })
    await waitFor(() => expect(result.current.connection?.configured).toBe(true))
    act(() => rateLimitListener(null))
    await act(async () => {
      snapshot.resolve({ remaining: 0, requestedEntity: 'Fixture', resetsAt: Date.now() + 60_000 })
      await snapshot.promise
    })
    expect(result.current.rateLimit).toBeNull()
  })
})
