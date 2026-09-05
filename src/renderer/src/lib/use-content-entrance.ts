import { useEffect, useRef } from 'react'
import { animate, stagger } from 'motion'

// Observe card mounts so asynchronous cache reads can join the entrance. Existing
// cards never replay when their scores, standings, or other live data change.
export function useContentEntrance(): React.RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const seen = new WeakSet<Element>()
    const pending = new Set<HTMLElement>()
    const animations = new Set<ReturnType<typeof animate>>()
    let keyboard = document.activeElement?.matches(':focus-visible') ?? false
    let frame = 0

    function finish(): void {
      animations.forEach((animation) => animation.complete())
      animations.clear()
    }

    function flush(): void {
      frame = 0
      const candidates = [...pending]
      pending.clear()
      if (keyboard || reducedMotion.matches || document.hidden) return

      const bounds = root!.getBoundingClientRect()
      const cards = candidates
        .filter((card) => {
          if (!card.isConnected || card.parentElement?.closest('[data-slot="card"]')) return false
          const rect = card.getBoundingClientRect()
          return rect.height > 0 && rect.bottom > bounds.top && rect.top < bounds.bottom
        })
        .slice(0, 5)
      if (cards.length === 0) return

      const animation = animate(
        cards,
        {
          opacity: [0.75, 1],
          transform: ['translateY(6px)', 'none']
        },
        {
          duration: 0.22,
          delay: stagger(0.035),
          ease: [0.16, 1, 0.3, 1]
        }
      )
      animations.add(animation)
      void animation.then(() => animations.delete(animation))
    }

    function collect(node: Element): void {
      const cards = [...node.querySelectorAll<HTMLElement>('[data-slot="card"]')]
      if (node instanceof HTMLElement && node.matches('[data-slot="card"]')) cards.unshift(node)
      for (const card of cards) {
        if (seen.has(card)) continue
        seen.add(card)
        pending.add(card)
      }
      if (pending.size > 0 && !frame) frame = requestAnimationFrame(flush)
    }

    function onKeyDown(): void {
      keyboard = true
      finish()
    }

    function onPointerDown(): void {
      keyboard = false
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) collect(node)
        })
      }
    })
    observer.observe(root, { childList: true, subtree: true })
    collect(root)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    reducedMotion.addEventListener('change', finish)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      finish()
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      reducedMotion.removeEventListener('change', finish)
    }
  }, [])

  return ref
}
