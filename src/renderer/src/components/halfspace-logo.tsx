import type { ComponentProps } from 'react'
import logoUrl from '../../../../resources/halfspace-logo.svg'
import { cn } from '@/lib/utils'

type HalfspaceLogoProps = Omit<ComponentProps<'img'>, 'src'>

export function HalfspaceLogo({
  alt = 'Halfspace',
  className,
  ...props
}: HalfspaceLogoProps): React.JSX.Element {
  return (
    <img
      {...props}
      alt={alt}
      className={cn('block shrink-0 select-none', className)}
      draggable={false}
      src={logoUrl}
    />
  )
}
