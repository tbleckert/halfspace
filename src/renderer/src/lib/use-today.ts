import { useEffect, useState } from 'react'
import { todayInTimeZone } from './date'

const clockRefreshInterval = 60_000

export function useTodayInTimeZone(timeZone: string): string {
  const [, setClock] = useState(() => Date.now())

  useEffect(() => {
    const refresh = (): void => setClock(Date.now())
    const interval = window.setInterval(refresh, clockRefreshInterval)

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return todayInTimeZone(timeZone)
}
