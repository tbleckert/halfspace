import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConnectionState } from './use-connection-state'

interface SportmonksTokenFormProps {
  autoFocus?: boolean
  buttonLabel: string
}

export function SportmonksTokenForm({
  autoFocus = false,
  buttonLabel
}: SportmonksTokenFormProps): React.JSX.Element {
  const { saveToken } = useConnectionState()
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitToken(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const result = await saveToken(token)

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      setToken('')
    } catch {
      setError('Could not save the token.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void submitToken(event)}>
      <Label htmlFor="sportmonks-token">API token</Label>
      <div className="flex gap-2">
        <Input
          id="sportmonks-token"
          autoCapitalize="none"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="Paste token"
          spellCheck={false}
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <Button disabled={saving || token.length === 0} type="submit">
          {saving ? 'Saving…' : buttonLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
