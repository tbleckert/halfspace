import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  selectClassName?: string
  size?: 'sm' | 'default'
}

export function NativeSelect({
  className,
  selectClassName,
  size = 'default',
  ...props
}: NativeSelectProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'group/native-select relative w-fit has-[select:disabled]:opacity-50',
        className
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          'h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pl-2.5 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-7 data-[size=sm]:rounded-md data-[size=sm]:py-0.5',
          selectClassName
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        data-slot="native-select-icon"
      />
    </div>
  )
}

export function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<'option'>): React.JSX.Element {
  return (
    <option
      data-slot="native-select-option"
      className={cn('bg-[Canvas] text-[CanvasText]', className)}
      {...props}
    />
  )
}
