import * as React from 'react'
import { cn } from '@/lib/utils'

export function EntitySubpageNavigation({
  className,
  ...props
}: React.ComponentProps<'nav'>): React.JSX.Element {
  return <nav className={cn('flex gap-6', className)} {...props} />
}
