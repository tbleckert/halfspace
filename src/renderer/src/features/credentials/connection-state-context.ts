import { createContext } from 'react'
import type { ConnectionState, Result, SportmonksRateLimit } from '@shared/contracts'

export interface ConnectionStateContextValue {
  connection: ConnectionState | null
  error: string | null
  rateLimit: SportmonksRateLimit | null
  clearToken: () => Promise<Result<null>>
  reload: () => Promise<void>
  saveToken: (token: string) => Promise<Result<ConnectionState>>
}

export const ConnectionStateContext = createContext<ConnectionStateContextValue | null>(null)
