import { useEffect, useRef, useState } from 'react'
import type { ViewBlock } from '@shared/views'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { viewBlockLabel } from './view-editing'

export function ViewBlockContainer({
  block,
  defer,
  children
}: {
  block: ViewBlock
  defer: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(
    () => !defer || typeof IntersectionObserver === 'undefined'
  )

  useEffect(() => {
    const element = container.current
    if (mounted || !element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setMounted(true)
      },
      { root: element.closest('.view-canvas'), rootMargin: '400px 0px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [mounted])

  // Mount once near the viewport. Keeping visited widgets mounted preserves local
  // controls and lets their existing shared queries own caching and refreshes.
  return (
    <div
      ref={container}
      className="view-block"
      data-span={block.span}
      data-widget={block.type}
      aria-label={`${block.type} widget, ${block.span} column${block.span === 1 ? '' : 's'}`}
      tabIndex={mounted ? -1 : 0}
      onFocus={() => setMounted(true)}
    >
      {mounted ? (
        children
      ) : (
        <Card className="min-h-60">
          <CardHeader>
            <CardTitle>{viewBlockLabel(block)}</CardTitle>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
