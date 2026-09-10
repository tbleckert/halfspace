import type { ComponentProps } from 'react'
import type { ViewContext } from '@shared/views'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

export function ViewContextSelect({
  contexts,
  placeholder,
  ...props
}: Omit<ComponentProps<typeof NativeSelect>, 'children'> & {
  contexts: ViewContext[]
  placeholder?: string
}): React.JSX.Element {
  return (
    <NativeSelect {...props}>
      {placeholder !== undefined && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
      {contexts.map((context) => (
        <NativeSelectOption
          key={`${context.competitionId}:${context.seasonId}`}
          value={`${context.competitionId}:${context.seasonId}`}
        >
          {context.competitionName} · {context.seasonName}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
