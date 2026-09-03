const hoverTimeouts = new WeakMap<HTMLElement, number>()

type PrefetchEvent = { currentTarget: HTMLElement }

export function startPrefetch(prefetch: () => Promise<void>): void {
  void prefetch().catch(() => undefined)
}

export function intentPrefetchProps(
  enabled: boolean,
  prefetch: () => Promise<void>
): {
  onFocus: (event: PrefetchEvent) => void
  onMouseEnter: (event: PrefetchEvent) => void
  onMouseLeave: (event: PrefetchEvent) => void
} {
  function start(element: HTMLElement): void {
    cancelHover(element)
    if (enabled && element.isConnected && navigator.onLine) startPrefetch(prefetch)
  }

  return {
    onFocus: ({ currentTarget }) => start(currentTarget),
    onMouseEnter: ({ currentTarget }) => {
      cancelHover(currentTarget)
      if (!enabled) return
      hoverTimeouts.set(
        currentTarget,
        window.setTimeout(() => start(currentTarget), 80)
      )
    },
    onMouseLeave: ({ currentTarget }) => cancelHover(currentTarget)
  }
}

function cancelHover(element: HTMLElement): void {
  const timeout = hoverTimeouts.get(element)
  if (timeout === undefined) return
  window.clearTimeout(timeout)
  hoverTimeouts.delete(element)
}
