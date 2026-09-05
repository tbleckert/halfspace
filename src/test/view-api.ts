import { vi } from 'vitest'
import type { ViewsApi } from '@shared/views'

export function mockViewsApi(): ViewsApi {
  return {
    getSettings: vi.fn().mockResolvedValue({ ok: true, data: { configured: false } }),
    saveKey: vi.fn().mockResolvedValue({ ok: true, data: null }),
    clearKey: vi.fn().mockResolvedValue({ ok: true, data: null }),
    generate: vi.fn(),
    cancel: vi.fn().mockResolvedValue(undefined),
    onProgress: vi.fn().mockReturnValue(() => undefined)
  }
}
