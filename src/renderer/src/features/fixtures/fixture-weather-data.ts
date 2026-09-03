import type { SportmonksWeatherReport } from '@shared/contracts'

interface FixtureWeatherData {
  label: string | null
  description: string | null
  temperature: string | null
  feelsLike: string | null
  humidity: string | null
  clouds: string | null
  periods: { label: string; temperature: string }[]
}

export function fixtureWeather(
  report: SportmonksWeatherReport | null | undefined
): FixtureWeatherData | null {
  if (!report) return null
  const unit =
    report.metric === 'celcius' || report.metric === 'celsius'
      ? '°C'
      : report.metric === 'fahrenheit'
        ? '°F'
        : null
  const format = (value: number | null | undefined): string | null =>
    value == null || !unit ? null : `${Math.round(value)}${unit}`
  const temperature = format(report.current?.temp ?? report.temperature?.current)
  const periods = (['morning', 'day', 'evening', 'night'] as const).flatMap((period) => {
    const value = format(report.temperature?.[period])
    return value ? [{ label: period[0].toUpperCase() + period.slice(1), temperature: value }] : []
  })
  return {
    label: report.type === 'forecast' ? 'Forecast' : report.type === 'actual' ? 'Recorded' : null,
    description: report.current?.description ?? report.description ?? null,
    temperature,
    feelsLike: format(report.current?.feels_like ?? report.feels_like?.current),
    humidity: report.current?.humidity ?? report.humidity ?? null,
    clouds: report.current?.clouds ?? report.clouds ?? null,
    periods: temperature ? [] : periods
  }
}
