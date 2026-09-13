import type { ComponentProps } from 'react'
import type { ViewTeamContext } from '@shared/views'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

export function ViewTeamSelect({
  teams,
  ...props
}: Omit<ComponentProps<typeof NativeSelect>, 'children'> & {
  teams: ViewTeamContext[]
}): React.JSX.Element {
  return (
    <NativeSelect {...props}>
      {props.value && !teams.some((team) => String(team.teamId) === String(props.value)) && (
        <NativeSelectOption value={props.value}>Team {props.value}</NativeSelectOption>
      )}
      {teams.map((team) => (
        <NativeSelectOption key={team.teamId} value={team.teamId}>
          {team.teamName}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
