import { isoDateInTimeZone } from './date'
import { useCurrentTime } from './use-current-time'

export function useTodayInTimeZone(timeZone: string): string {
  return isoDateInTimeZone(useCurrentTime(), timeZone)
}
