import type { SportmonksReferee } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RefereeBackground({
  referee
}: {
  referee: SportmonksReferee
}): React.JSX.Element | null {
  const details = [
    ['Nationality', referee.nationality?.name],
    ['Birth city', referee.city?.name],
    ['Born', referee.date_of_birth]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))
  if (!details.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label} className="space-y-1 text-sm">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={label === 'Born' ? 'font-mono tabular-nums' : 'font-medium'}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
