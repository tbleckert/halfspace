import { useEffect, useState } from 'react'
import { Check, KeyRound, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AiSettings(): React.JSX.Element {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void window.halfspace.views
      .getSettings()
      .then((result) => {
        if (!active) return
        if (result.ok) setConfigured(result.data.configured)
        else setError(result.error.message)
      })
      .catch(() => {
        if (active) setError('Could not read your OpenAI settings.')
      })
    return () => {
      active = false
    }
  }, [])

  async function update(remove: boolean): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const result = await (remove
        ? window.halfspace.views.clearKey()
        : window.halfspace.views.saveKey({ key }))
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setConfigured(!remove)
      setKey('')
    } catch {
      setError('Could not update your OpenAI key.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>AI views</CardTitle>
        {configured && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5" />
            Key saved
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Build personal football views with OpenAI. Your key is encrypted on this device.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void update(false)
          }}
          className="space-y-2"
        >
          <Label htmlFor="openai-key">OpenAI API key</Label>
          <div className="flex gap-2">
            <Input
              id="openai-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              placeholder={configured ? 'Replace your key' : 'sk-…'}
              onChange={(event) => setKey(event.target.value)}
              disabled={busy}
            />
            <Button type="submit" disabled={busy || key.trim().length < 10}>
              <KeyRound className="size-3.5" />
              {busy ? 'Saving…' : 'Save key'}
            </Button>
            {configured && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Remove OpenAI key"
                disabled={busy}
                onClick={() => void update(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </form>
        <p className="text-xs leading-relaxed text-muted-foreground">
          When you build or edit, your prompt, view layout, and competition and season names are
          sent to OpenAI using GPT-5.4 mini. Usage is billed to your API account. Opening saved
          views does not use AI.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
