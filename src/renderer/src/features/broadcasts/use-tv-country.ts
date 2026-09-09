import { useState } from 'react'

interface TvCountry {
  id: string
  name: string
}
const preferenceKey = 'halfspace:tv-country'

function readCountry(): TvCountry | null {
  try {
    const value = JSON.parse(localStorage.getItem(preferenceKey) ?? 'null')
    return typeof value?.id === 'string' && typeof value?.name === 'string' ? value : null
  } catch {
    return null
  }
}

export function useTvCountry(): {
  country: TvCountry | null
  setCountry: (country: TvCountry | null) => void
  error: string | null
} {
  const [country, updateCountry] = useState(readCountry)
  const [error, setError] = useState<string | null>(null)
  function setCountry(next: TvCountry | null): void {
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(next))
      updateCountry(next)
      setError(null)
    } catch {
      setError('Could not save your TV country. Please try again.')
    }
  }
  return { country, setCountry, error }
}
