import 'fake-indexeddb/auto'
import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  window.matchMedia = (query): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true)
  })
  window.scrollTo = (): void => undefined
  HTMLElement.prototype.scrollIntoView = vi.fn()
  globalThis.ResizeObserver = class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  globalThis.IntersectionObserver = class {
    readonly root = null
    readonly rootMargin = '0px'
    readonly thresholds = [0]
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
  }
}
