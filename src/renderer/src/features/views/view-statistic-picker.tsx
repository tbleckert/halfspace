import { useMemo, useState } from 'react'
import type { PlayerViewSelection, TeamViewSelection, ViewStatisticContext } from '@shared/views'
import { db } from '@/data/db'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
  const entityOptions = [
    ...(!entityId
      ? [{ value: '', label: <>Choose a {kind === 'players' ? 'player' : 'team'}</> }]
      : []),
    ...(entityId && !available?.some((entity) => entity.id === entityId)
      ? [
          {
            value: String(entityId),
            label: (
              <>
                {kind === 'players' ? 'Player' : 'Team'} {entityId}
              </>
            )
          }
        ]
      : []),
    ...(available?.map((entity) => ({ value: String(entity.id), label: entity.name })) ?? [])
  ]
  const seasonOptions = [
    { value: '', label: 'Choose club and season', disabled: true },
    ...(currentKey && !options.some((option) => option.key === currentKey)
      ? [{ value: String(currentKey), label: <>Saved selection · Season {selection!.seasonId}</> }]
      : []),
    ...options.map((option) => ({
      value: String(option.key),
      label: (
        <>
          {option.teamName} · {option.competitionName} · {option.season.name}
        </>
      )
    }))
  ]
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-2 text-xs font-medium">{label}</legend>
      <Select
        items={entityOptions}
        disabled={disabled}
        value={String(entityId ?? '')}
        onValueChange={(value) => {
          if (value === null) return
          setChosenId(Number(value))
          onPending?.()
        }}
      >
        <SelectTrigger
          className="w-full min-w-0"
          aria-label={`${label} ${kind === 'players' ? 'player' : 'team'}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {entityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        items={seasonOptions}
        disabled={disabled}
        value={String(currentKey)}
        onValueChange={(value) => {
          if (value === null) return
          const record = options.find((item) => item.key === value)
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
        <SelectTrigger className="w-full min-w-0" aria-label={`${label} club and season`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {seasonOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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
