import type { SportmonksTeamRanking } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TeamRankings({
  rankings
}: {
  rankings?: SportmonksTeamRanking[]
}): React.JSX.Element | null {
  if (!rankings?.length) return null

  return (
    <Card>
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">Rankings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {rankings.map((ranking) => (
          <div key={ranking.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{ranking.type}</p>
              <p className="text-muted-foreground text-xs">
                <span className="font-mono tabular-nums">
                  {ranking.points?.toLocaleString() ?? '—'}
                </span>{' '}
                points
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {ranking.position ?? '—'}
              </p>
              <p className="text-muted-foreground text-xs">Rank</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
