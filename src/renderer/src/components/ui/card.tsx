import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="card"
      className={cn('rounded-xl bg-card text-card-foreground', className)}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('flex flex-col gap-1 px-4 pb-3 pt-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h2'>): React.JSX.Element {
  return <h2 className={cn('font-semibold tracking-tight', className)} {...props} />
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>): React.JSX.Element {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('p-4 pt-0', className)} {...props} />
}
