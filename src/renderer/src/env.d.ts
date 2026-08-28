/// <reference types="vite/client" />

import type { HalfspaceApi } from '../../shared/contracts'

declare global {
  interface Window {
    halfspace: HalfspaceApi
  }
}

export {}
