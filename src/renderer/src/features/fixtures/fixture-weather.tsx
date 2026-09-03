import { CloudSun } from 'lucide-react'
import type { SportmonksWeatherReport } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fixtureWeather } from './fixture-weather-data'

export function FixtureWeather({
  report
}: {
  report?: SportmonksWeatherReport | null
}): React.JSX.Element | null {
  const weather = fixtureWeather(report)
  if (!weather) return null
  const details = [
    { label: 'Feels like', value: weather.feelsLike },
    { label: 'Humidity', value: weather.humidity },
    { label: 'Cloud cover', value: weather.clouds }
  ].filter(({ value }) => value !== null)
  if (
    !weather.temperature &&
    !weather.description &&
    weather.periods.length === 0 &&
    details.length === 0
  )
    return null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b px-4 py-3">
        <CardTitle className="text-sm">Weather</CardTitle>
        {weather.label && <span className="text-xs text-muted-foreground">{weather.label}</span>}
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {(weather.temperature || weather.description) && (
          <div className="flex items-center gap-3">
            <CloudSun aria-hidden className="size-7 shrink-0 text-muted-foreground" />
            <div>
              {weather.temperature && (
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {weather.temperature}
                </p>
              )}
              {weather.description && (
                <p className="text-sm text-muted-foreground first-letter:uppercase">
                  {weather.description}
                </p>
              )}
            </div>
          </div>
        )}
        {weather.periods.length > 0 && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {weather.periods.map((period) => (
              <div key={period.label}>
                <dt className="text-xs text-muted-foreground">{period.label}</dt>
                <dd className="mt-1 font-mono tabular-nums">{period.temperature}</dd>
              </div>
            ))}
          </dl>
        )}
        {details.length > 0 && (
          <dl className="space-y-2 text-sm">
            {details.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
