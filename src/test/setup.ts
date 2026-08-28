import 'fake-indexeddb/auto'

if (typeof window !== 'undefined') {
  window.scrollTo = (): void => undefined
}
