import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trophy, RefreshCw } from 'lucide-react'
import type { RefreshHonoursInput } from '@shared/contracts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ErrorAlert } from '@/components/error-alert'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { useHonours } from './use-honours'

export function HonoursPanel({
  entity,
  entityId,
  online
}: RefreshHonoursInput & { online: boolean }): React.JSX.Element {
  const input = useMemo(() => ({ entity, entityId }), [entity, entityId])
  const query = useHonours(input, online)
  const [result, setResult] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const honours = (query.cached?.honours ?? [])
    .filter((item) => result === 'all' || item.trophy?.position === Number(result))
    .toSorted(
      (a, b) =>
        (b.season?.starting_at ?? '').localeCompare(a.season?.starting_at ?? '') ||
        (b.season?.name ?? '').localeCompare(a.season?.name ?? '', undefined, { numeric: true }) ||
        a.id - b.id
    )
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
        <CardTitle>Honours</CardTitle>
        <div className="flex items-center gap-1">
          {!!query.cached?.honours.length && (
            <NativeSelect
              aria-label="Honours result"
              value={result}
              onChange={(event) => {
                setResult(event.target.value)
                setExpanded(false)
              }}
            >
              <NativeSelectOption value="all">All results</NativeSelectOption>
              <NativeSelectOption value="1">Winners</NativeSelectOption>
              <NativeSelectOption value="2">Runners-up</NativeSelectOption>
            </NativeSelect>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh honours"
            disabled={!online || query.refreshing}
            onClick={() => void query.refresh()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>
      {query.error && (
        <CardContent className="p-4">
          <ErrorAlert>{query.error}</ErrorAlert>
        </CardContent>
      )}
      <div className="divide-y">
        {honours.slice(0, expanded ? undefined : 8).map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <CompetitionLogo
              className="size-8 shrink-0"
              imagePath={item.league?.image_path ?? null}
              online={online}
            />
            <div className="min-w-0 flex-1">
              <Link
                to="/competitions/$competitionId"
                params={{ competitionId: String(item.league_id) }}
                search={{ season: item.season_id ?? undefined }}
                className="text-sm font-medium hover:text-primary"
              >
                {item.league?.name ?? 'Competition unavailable'}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {item.season?.name ?? 'Season unavailable'}
                </span>
                {item.team && (
                  <>
                    {' '}
                    ·{' '}
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: String(item.team.id) }}
                      search={{ competition: item.league_id, season: item.season_id ?? undefined }}
                      className="hover:text-primary"
                    >
                      {item.team.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
              {item.trophy?.position === 1 && (
                <Trophy aria-label="Winner" className="size-3.5 text-primary" />
              )}
              {item.trophy?.name ?? 'Result unavailable'}
            </span>
          </div>
        ))}
      </div>
      {!honours.length && (
        <CardContent className="p-4 text-sm text-muted-foreground">
          {query.cached
            ? result === 'all'
              ? 'No reported honours'
              : 'No reported honours for this selection'
            : query.error
              ? 'Honours unavailable'
              : !online
                ? 'Honours not available offline'
                : 'Loading honours…'}
        </CardContent>
      )}
      {honours.length > 8 && (
        <div className="border-t px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show fewer' : 'Show all honours'}
          </Button>
        </div>
      )}
    </Card>
  )
}
