import type { SportmonksRefereeStatistic } from '@shared/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { refereeStatisticsSummary } from '@/features/statistics/statistics-data'
import { refereeSeasonOptions } from './referee-statistics-data'

export function RefereeStatistics({
  statistics,
  seasonId,
  onSeasonChange
}: {
  statistics?: SportmonksRefereeStatistic[]
  seasonId?: number
  onSeasonChange: (seasonId: number) => void
}): React.JSX.Element {
  const options = refereeSeasonOptions(statistics ?? [])
  const selectedId = seasonId ?? options[0]?.id
  const selected = statistics?.find(({ season_id }) => season_id === selectedId)
  const summary = refereeStatisticsSummary(selected?.details ?? [])
  const hasValues =
    summary.matches !== null ||
    summary.rows.some(({ total, average }) => total !== null || average !== null)
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <CardTitle className="text-sm">Season stats</CardTitle>
        {options.length > 0 && (
          <NativeSelect
            aria-label="Referee statistics season"
            value={selectedId ?? ''}
            onChange={(event) => onSeasonChange(Number(event.target.value))}
          >
            {selectedId && !options.some(({ id }) => id === selectedId) && (
              <NativeSelectOption value={selectedId}>Selected season</NativeSelectOption>
            )}
            {options.map(({ id, name }) => (
              <NativeSelectOption key={id} value={id}>
                {name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </CardHeader>
      {!hasValues ? (
        <CardContent className="p-4 text-sm text-muted-foreground">
          {statistics === undefined
            ? 'Season stats unavailable'
            : 'No stats reported for this season'}
        </CardContent>
      ) : (
        <div className="grid md:grid-cols-[180px_1fr]">
          <div className="border-b p-5 md:border-r md:border-b-0">
            <p className="text-sm text-muted-foreground">Matches</p>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">
              {summary.matches ?? '–'}
            </p>
          </div>
          <Table aria-label="Referee season statistics">
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Statistic</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="px-4 text-right">Per match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.rows.map(({ label, total, average }) => (
                <TableRow key={label} className="hover:bg-transparent">
                  <TableCell className="px-4">{label}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {total ?? '–'}
                  </TableCell>
                  <TableCell className="px-4 text-right font-mono tabular-nums">
                    {average?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '–'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
