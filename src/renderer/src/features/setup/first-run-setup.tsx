import { useState } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/error-alert'
import { CompetitionLogo } from '@/features/competitions/competition-logo'
import { useCompetitions } from '@/features/competitions/use-competitions'
import { TokenSetup } from '@/features/credentials/token-setup'
import { useOnline } from '@/lib/use-online'
import { SetupScreen } from './setup-screen'
import { saveSetupStep, type SetupStep } from './setup-progress'
import { SetupTeams } from './setup-teams'

export function FirstRunSetup({
  initialStep,
  onComplete
}: {
  initialStep: Exclude<SetupStep, 'complete'>
  onComplete: () => Promise<void>
}): React.JSX.Element {
  const online = useOnline()
  const [step, setStep] = useState(initialStep)
  const [changingToken, setChangingToken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const competitions = useCompetitions(online && step === 'competitions' && !changingToken)

  function changeStep(next: Exclude<SetupStep, 'complete'>): void {
    try {
      saveSetupStep(next)
      setStep(next)
      setError(null)
    } catch {
      setError('Could not save setup progress. Please try again.')
    }
  }

  async function finish(): Promise<void> {
    setFinishing(true)
    setError(null)
    try {
      await onComplete()
    } catch {
      setError('Could not finish setup. Please try again.')
    } finally {
      setFinishing(false)
    }
  }

  if (changingToken) return <TokenSetup onCancel={() => setChangingToken(false)} />

  if (step === 'teams')
    return (
      <SetupScreen
        title="Choose your teams"
        description="Pin teams to see their upcoming games and recent results on Matchday. You can change your choices later."
        step={3}
      >
        <SetupTeams online={online} />
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={finishing} onClick={() => changeStep('competitions')}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button disabled={finishing} onClick={() => void finish()}>
            {finishing ? 'Opening…' : 'Open Matchday'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </SetupScreen>
    )

  const available = competitions.cached?.competitions ?? []
  const loaded = !!competitions.cached?.catalog
  return (
    <SetupScreen
      title="Your competitions"
      description="Check your competition access, then choose your teams. Available data varies by competition and plan."
      step={2}
    >
      {competitions.error && <ErrorAlert>{competitions.error}</ErrorAlert>}
      {!loaded ? (
        !online ? (
          <p role="status" className="text-sm text-muted-foreground">
            Connect to the internet to check your competitions.
          </p>
        ) : competitions.error ? null : (
          <div role="status" aria-label="Checking competitions" className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((id) => (
              <Skeleton key={id} className="h-16 w-full" />
            ))}
          </div>
        )
      ) : available.length ? (
        <ul
          aria-label="Available competitions"
          className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
        >
          {available.map((competition) => (
            <li key={competition.id}>
              <Card className="flex h-full items-center gap-3 p-3">
                <CompetitionLogo
                  imagePath={competition.imagePath}
                  online={online}
                  className="size-8 shrink-0 bg-background"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{competition.name}</p>
                  {competition.raw.country && (
                    <p className="text-xs text-muted-foreground">{competition.raw.country.name}</p>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
          No competitions were returned for this token. Check your Football plan in MySportmonks, or
          continue to the workspace.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          disabled={!online || competitions.refreshing}
          onClick={() => void competitions.refresh()}
        >
          <RefreshCw className="size-3.5" />
          Check again
        </Button>
        <Button variant="ghost" onClick={() => setChangingToken(true)}>
          Change token
        </Button>
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" disabled={finishing} onClick={() => void finish()}>
          Skip setup
        </Button>
        <Button disabled={finishing} onClick={() => changeStep('teams')}>
          Choose teams
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </SetupScreen>
  )
}
