import type { ComponentProps } from 'react'
import type { ViewContext } from '@shared/views'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export function ViewContextSelect({
  contexts,
  value,
  onValueChange,
  disabled,
  placeholder,
  allowAll = false,
  ...props
}: {
  contexts: ViewContext[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  allowAll?: boolean
} & Pick<
  ComponentProps<typeof SelectTrigger>,
  'id' | 'className' | 'aria-label' | 'disabled'
>): React.JSX.Element {
  const options = contexts.map((context) => ({
    value: `${context.competitionId}:${context.seasonId}`,
    label: `${context.competitionName} · ${context.seasonName}`
  }))
  if (allowAll) options.unshift({ value: 'all', label: 'All available competitions' })
  return (
    <Select
      items={options}
      value={value || null}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next)
      }}
    >
      <SelectTrigger {...props}>
        <SelectValue placeholder={placeholder ?? 'Choose competition and season'} />
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
