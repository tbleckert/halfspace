import { describe, expect, it } from 'vitest'
import { fixtureWeather } from './fixture-weather-data'

describe('fixture weather presentation', () => {
  it('preserves zero readings and uses the report temperature unit', () => {
    expect(
      fixtureWeather({
        id: 1,
        fixture_id: 50,
        metric: 'celcius',
        type: 'actual',
        current: { temp: 0, feels_like: -3.2, humidity: '0%', description: 'snow' }
      })
    ).toMatchObject({
      temperature: '0°C',
      feelsLike: '-3°C',
      humidity: '0%',
      description: 'snow',
      label: 'Recorded'
    })
    expect(
      fixtureWeather({
        id: 1,
        fixture_id: 50,
        metric: 'fahrenheit',
        type: 'forecast',
        temperature: { current: 77 }
      })
    ).toMatchObject({ temperature: '77°F', label: 'Forecast' })
  })

  it('keeps daily forecasts separate rather than guessing the kickoff temperature', () => {
    expect(
      fixtureWeather({
        id: 1,
        fixture_id: 50,
        metric: 'celcius',
        type: 'forecast',
        temperature: { day: 20, evening: 14 }
      })
    ).toMatchObject({
      temperature: null,
      periods: [
        { label: 'Day', temperature: '20°C' },
        { label: 'Evening', temperature: '14°C' }
      ]
    })
  })

  it('leaves unavailable weather absent and does not invent units', () => {
    expect(fixtureWeather(null)).toBeNull()
    expect(fixtureWeather(undefined)).toBeNull()
    expect(
      fixtureWeather({ id: 1, fixture_id: 50, metric: 'unknown', current: { temp: 20 } })
        ?.temperature
    ).toBeNull()
  })
})
