import { useEffect, useRef, type ReactNode } from 'react'
import { HalfspaceLogo } from '@/components/halfspace-logo'

export function SetupScreen({
  title,
  description,
  step,
  children,
  focusHeading = true
}: {
  title: string
  description: ReactNode
  step: number
  children: ReactNode
  focusHeading?: boolean
}): React.JSX.Element {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusHeading) heading.current?.focus()
  }, [title, focusHeading])
  return (
    <main className="h-full overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-6 py-16">
        <HalfspaceLogo className="mb-7 size-10 rounded-xl" />
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight outline-none"
        >
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-7 space-y-5">{children}</div>
        <p aria-label="Setup progress" className="mt-7 text-xs text-muted-foreground">
          Step {step} of 3
        </p>
      </div>
    </main>
  )
}
