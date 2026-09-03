// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRefreshStatus } from './use-refresh-status'

describe('refresh status', () => {
  it('shows request errors and clears them on a successful retry', async () => {
    const { result } = renderHook(() => useRefreshStatus('team:9'))
    await act(() =>
      result.current.runRefresh(async () => {
        throw new Error('Offline')
      }, 'Could not refresh.')
    )
    expect(result.current.error).toBe('Offline')
    expect(result.current.refreshing).toBe(false)
    await act(() => result.current.runRefresh(async () => {}, 'Could not refresh.'))
    expect(result.current.error).toBeNull()
  })

  it('uses the fallback for non-Error failures', async () => {
    const { result } = renderHook(() => useRefreshStatus(null))
    await act(() => result.current.runRefresh(() => Promise.reject(null), 'Could not refresh.'))
    expect(result.current.error).toBe('Could not refresh.')
  })

  it('keeps only the latest request status when refreshes overlap', async () => {
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    const { result } = renderHook(() => useRefreshStatus(9))
    let firstRun: Promise<void>
    let secondRun: Promise<void>
    act(() => {
      firstRun = result.current.runRefresh(() => first.promise, 'First failed.')
    })
    act(() => {
      secondRun = result.current.runRefresh(() => second.promise, 'Second failed.')
    })
    await act(async () => {
      first.reject(new Error('First failed.'))
      await firstRun
    })
    expect(result.current.refreshing).toBe(true)
    expect(result.current.error).toBeNull()
    await act(async () => {
      second.resolve()
      await secondRun
    })
    expect(result.current.refreshing).toBe(false)
  })

  it('does not revive an old request after navigating away and back', async () => {
    const pending = Promise.withResolvers<void>()
    const { result, rerender } = renderHook(({ key }) => useRefreshStatus(key), {
      initialProps: { key: 'team:9|season:100' }
    })
    let request: Promise<void>
    act(() => {
      request = result.current.runRefresh(() => pending.promise, 'Could not refresh.')
    })
    rerender({ key: 'team:9|season:101' })
    expect(result.current.refreshing).toBe(false)
    rerender({ key: 'team:9|season:100' })
    await act(async () => {
      pending.reject(new Error('Old failure'))
      await request
    })
    expect(result.current.error).toBeNull()
    expect(result.current.refreshing).toBe(false)
  })
})
