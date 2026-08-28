import { useContext } from 'react'
import {
  ConnectionStateContext,
  type ConnectionStateContextValue
} from './connection-state-context'

export function useConnectionState(): ConnectionStateContextValue {
  const context = useContext(ConnectionStateContext)

  if (!context) {
    throw new Error('useConnectionState must be used inside ConnectionStateProvider.')
  }

  return context
}
