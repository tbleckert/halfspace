import { Command as CommandPrimitive } from 'cmdk'
import { cn } from '@/lib/utils'

export function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>): React.JSX.Element {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex w-full flex-col overflow-hidden bg-popover text-popover-foreground',
        className
      )}
      {...props}
    />
  )
}

export function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>): React.JSX.Element {
  return (
    <CommandPrimitive.Input
      data-slot="command-input"
      className={cn(
        'h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>): React.JSX.Element {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[min(32rem,62vh)] overflow-y-auto p-2', className)}
      {...props}
    />
  )
}

export function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>): React.JSX.Element {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'flex w-full cursor-default items-center gap-3 rounded-lg px-2 py-2 text-left outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className
      )}
      {...props}
    />
  )
}
