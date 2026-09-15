import type { ComponentProps } from 'react'
import type { ViewTeamContext } from '@shared/views'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export function ViewTeamSelect({
  teams,
  value,
  onValueChange,
  disabled,
  ...props
}: {
  teams: ViewTeamContext[]
  value: string | number
  onValueChange: (value: string) => void
} & Pick<
  ComponentProps<typeof SelectTrigger>,
  'id' | 'className' | 'aria-label' | 'disabled'
>): React.JSX.Element {
  const options = teams.map((team) => ({ value: String(team.teamId), label: team.teamName }))
  if (value && !options.some((option) => option.value === String(value))) {
    options.unshift({ value: String(value), label: `Team ${value}` })
  }
  return (
    <Select
      items={options}
      value={String(value)}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next)
      }}
    >
      <SelectTrigger {...props}>
        <SelectValue placeholder="Choose a team" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
