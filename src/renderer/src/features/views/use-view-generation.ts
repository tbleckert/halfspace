import { useEffect, useRef, useState } from 'react'
import { validateViewSpec, type ViewBlock, type ViewContext, type ViewSpec } from '@shared/views'

export function useViewGeneration(): {
  generating: boolean
  blocks: ViewBlock[]
  error: string | null
  generate: (
    prompt: string,
    contexts: ViewContext[],
    current: ViewSpec | null
  ) => Promise<ViewSpec | null>
  cancel: () => void
} {
  const request = useRef<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [blocks, setBlocks] = useState<ViewBlock[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const unsubscribe = window.halfspace.views.onProgress((progress) => {
      if (progress.requestId === request.current) setBlocks(progress.blocks)
    })
    return () => {
      unsubscribe()
      const abandoned = request.current
      request.current = null
      if (abandoned) void window.halfspace.views.cancel(abandoned).catch(() => undefined)
    }
  }, [])

  function cancel(): void {
    const abandoned = request.current
    request.current = null
    setGenerating(false)
    setBlocks([])
    setError(null)
    if (abandoned) void window.halfspace.views.cancel(abandoned).catch(() => undefined)
  }

  async function generate(
    prompt: string,
    contexts: ViewContext[],
    current: ViewSpec | null
  ): Promise<ViewSpec | null> {
    cancel()
    const requestId = crypto.randomUUID()
    request.current = requestId
    setGenerating(true)
    setBlocks([])
    setError(null)
    try {
      const result = await window.halfspace.views.generate({ requestId, prompt, contexts, current })
      if (request.current !== requestId) return null
      if (!result.ok) {
        setError(result.error.message)
        return null
      }
      const spec = validateViewSpec(result.data, contexts)
      if (!spec.blocks.length) {
        setError(
          spec.message ||
            'This view is not supported yet. Try fixtures, standings, or player leaders.'
        )
        return null
      }
      return spec
    } catch {
      if (request.current === requestId) setError('Could not finish your view. Please try again.')
      return null
    } finally {
      if (request.current === requestId) {
        request.current = null
        setGenerating(false)
        setBlocks([])
      }
    }
  }
  return { generating, blocks, error, generate, cancel }
}
