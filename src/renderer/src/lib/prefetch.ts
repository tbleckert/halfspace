export function startPrefetch(prefetch: () => Promise<void>): void {
  void prefetch().catch(() => undefined)
}

export function intentPrefetchProps(
  enabled: boolean,
  prefetch: () => Promise<void>
): {
  onFocus: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
} {
  let hoverTimeout: number | undefined

  function cancelHover(): void {
    if (hoverTimeout === undefined) return
    window.clearTimeout(hoverTimeout)
    hoverTimeout = undefined
  }

  function start(): void {
    cancelHover()
    if (enabled) startPrefetch(prefetch)
  }

  return {
    onFocus: start,
    onMouseEnter: () => {
      if (!enabled) return
      hoverTimeout = window.setTimeout(start, 80)
    },
    onMouseLeave: cancelHover
  }
}
