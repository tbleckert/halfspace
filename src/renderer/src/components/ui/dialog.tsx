import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'

export function Dialog(props: DialogPrimitive.Root.Props): React.JSX.Element {
  return <DialogPrimitive.Root {...props} />
}

export function DialogTrigger(props: DialogPrimitive.Trigger.Props): React.JSX.Element {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

export function DialogContent({
  className,
  ...props
}: DialogPrimitive.Popup.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-overlay/35"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl outline-none',
          className
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-semibold', className)}
      {...props}
    />
  )
}
