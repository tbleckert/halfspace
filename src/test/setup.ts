import 'fake-indexeddb/auto'
import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  window.scrollTo = (): void => undefined
  HTMLElement.prototype.scrollIntoView = vi.fn()
  globalThis.ResizeObserver = class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
}
