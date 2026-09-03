import type { StatisticSeasonRecord } from '@shared/contracts'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { ComparisonKind } from './comparison-data'
import type { ComparisonSeasonContext } from './use-comparison-season'

export function ComparisonSeasonPicker({
  side,
  kind,
  context,
  online,
  onSelect
}: {
  side: 'First' | 'Second'
  kind: ComparisonKind
  context: ComparisonSeasonContext
  online: boolean
  onSelect: (record: StatisticSeasonRecord) => void
}): React.JSX.Element {
  const { selected, seasons, cached, error, refreshing, refresh } = context
  const group = seasons.find((season) => season.records.some((record) => record === selected))
  const recordLabel = (record: StatisticSeasonRecord): string =>
    kind === 'players' ? `${record.teamName} · ${record.competitionName}` : record.competitionName
  const recordKey = (record: StatisticSeasonRecord): string =>
    `${record.season.id}:${record.teamId}`

  return (
    <div className="flex flex-col items-start gap-2">
      {!!seasons.length && (
        <>
          <NativeSelect
            aria-label={`${side} season`}
            value={group?.name ?? ''}
            onChange={(event) => {
              const next = seasons.find((season) => season.name === event.target.value)!
              const record =
                next.records.find(
                  (record) =>
                    record.teamId === selected?.teamId &&
                    record.season.league_id === selected?.season.league_id
                ) ??
                next.records.find(
                  (record) => record.season.league_id === selected?.season.league_id
                ) ??
                next.records[0]
              onSelect(record)
            }}
          >
            {!group && <NativeSelectOption value="">Choose season</NativeSelectOption>}
            {seasons.map((season) => (
              <NativeSelectOption key={season.name} value={season.name}>
                {season.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {group && group.records.length > 1 ? (
            <NativeSelect
              aria-label={`${side} record`}
              className="max-w-full"
              value={selected ? recordKey(selected) : ''}
              onChange={(event) =>
                onSelect(group.records.find((record) => recordKey(record) === event.target.value)!)
              }
            >
              {group.records.map((record) => (
                <NativeSelectOption key={recordKey(record)} value={recordKey(record)}>
                  {recordLabel(record)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : selected ? (
            <p className="flex min-h-8 items-center text-xs text-muted-foreground">
              {recordLabel(selected)}
            </p>
          ) : null}
        </>
      )}
      {(!cached || !seasons.length) && (
        <p role="status" className="text-sm text-muted-foreground">
          {refreshing || (cached === undefined && online)
            ? 'Loading seasons…'
            : cached
              ? 'No available season statistics'
              : online
                ? 'Available seasons could not be loaded'
                : 'Available seasons are not cached'}
        </p>
      )}
      {cached && seasons.length > 0 && !selected && (
        <p role="status" className="text-sm text-muted-foreground">
          The selected record is not available
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {online && (error || !seasons.length) && (
        <Button size="sm" variant="ghost" disabled={refreshing} onClick={() => void refresh()}>
          Refresh seasons
        </Button>
      )}
    </div>
  )
}
