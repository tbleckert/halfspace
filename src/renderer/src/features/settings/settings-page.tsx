import { useState } from 'react'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { useConnectionState } from '@/features/credentials/use-connection-state'
import { SportmonksTokenForm } from '@/features/credentials/sportmonks-token-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage(): React.JSX.Element {
  const { clearToken } = useConnectionState()
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function disconnect(): Promise<void> {
    setClearing(true)
    setError(null)

    try {
      const result = await clearToken()
      if (!result.ok) setError(result.error.message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-7 lg:p-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Sportmonks token</CardTitle>
            <Badge>
              <CheckCircle2 className="mr-1 size-3" /> Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <SportmonksTokenForm buttonLabel="Replace" />

          <div className="border-t pt-5">
            <Button disabled={clearing} variant="outline" onClick={() => void disconnect()}>
              <Trash2 className="size-4" />
              Disconnect
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
