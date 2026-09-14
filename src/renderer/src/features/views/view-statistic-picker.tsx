import { useMemo, useState } from 'react'
import type { PlayerViewSelection, TeamViewSelection, ViewStatisticContext } from '@shared/views'
import { db } from '@/data/db'
import { NativeSelect } from '@/components/ui/native-select'
import { useScopedLiveQuery } from '@/lib/use-scoped-live-query'
import { useOnline } from '@/lib/use-online'
import { useStatisticSeasons } from '@/features/comparisons/use-statistic-seasons'
import { BlockError } from './view-block-state'

export function ViewStatisticPicker({
  kind,
  label,
  selection,
  onSelect,
  onPending,
  disabled = false
}: {
  kind: 'players' | 'teams'
  disabled?: boolean
  label: string
  selection?: PlayerViewSelection | TeamViewSelection
  onSelect: (context: ViewStatisticContext) => void
  onPending?: () => void
}): React.JSX.Element {
  const [chosenId, setChosenId] = useState<number | null>(null)
  const available = useScopedLiveQuery(
    async () =>
      kind === 'players'
        ? (await db.players.orderBy('displayName').toArray()).map((player) => ({
            id: player.id,
            name: player.displayName
          }))
        : (await db.teams.orderBy('name').toArray()).map((team) => ({
            id: team.id,
            name: team.name
          })),
    [kind]
  )
  const savedId = selection && ('playerId' in selection ? selection.playerId : selection.teamId)
  const entityId = chosenId ?? savedId ?? available?.[0]?.id
  const input = useMemo(() => (entityId ? { entity: kind, entityId } : null), [kind, entityId])
  const online = useOnline()
  const query = useStatisticSeasons(input, online)
  const records =
    query.cached?.records.filter((record) => kind === 'players' || record.teamId === entityId) ?? []
  const options = records.map((record) => ({
    ...record,
    key: `${record.season.league_id}:${record.season.id}:${record.teamId}`
  }))
  const currentKey =
    selection && entityId === savedId
      ? `${selection.competitionId}:${selection.seasonId}:${selection.teamId}`
      : ''
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-2 text-xs font-medium">{label}</legend>
      <NativeSelect
        disabled={disabled}
        className="w-full min-w-0"
        aria-label={`${label} ${kind === 'players' ? 'player' : 'team'}`}
        value={entityId ?? ''}
        onChange={(event) => {
          setChosenId(Number(event.target.value))
          onPending?.()
        }}
      >
        {!entityId && <option value="">Choose a {kind === 'players' ? 'player' : 'team'}</option>}
        {entityId && !available?.some((entity) => entity.id === entityId) && (
          <option value={entityId}>
            {kind === 'players' ? 'Player' : 'Team'} {entityId}
          </option>
        )}
        {available?.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        disabled={disabled}
        className="w-full min-w-0"
        aria-label={`${label} club and season`}
        value={currentKey}
        onChange={(event) => {
          const record = options.find((item) => item.key === event.target.value)
          if (!record || !entityId) return
          onSelect({
            kind,
            entityId,
            entityName:
              available?.find((entity) => entity.id === entityId)?.name ??
              `${kind === 'players' ? 'Player' : 'Team'} ${entityId}`,
            teamId: record.teamId,
            teamName: record.teamName,
            competitionId: record.season.league_id,
            competitionName: record.competitionName,
            seasonId: record.season.id,
            seasonName: record.season.name
          })
          setChosenId(null)
        }}
      >
        <option value="" disabled>
          Choose club and season
        </option>
        {currentKey && !options.some((option) => option.key === currentKey) && (
          <option value={currentKey}>Saved selection · Season {selection!.seasonId}</option>
        )}
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.teamName} · {option.competitionName} · {option.season.name}
          </option>
        ))}
      </NativeSelect>
      <BlockError error={query.error} online={online} refresh={query.refresh} />
      {!records.length && (
        <p className="text-xs text-muted-foreground">
          {!entityId
            ? `Open a ${kind === 'players' ? 'player' : 'team'} to make it available.`
            : query.cached
              ? 'No statistic seasons reported.'
              : online && !query.error
                ? 'Loading available seasons…'
                : 'Season selections are not cached for offline use.'}
        </p>
      )}
    </fieldset>
  )
}
