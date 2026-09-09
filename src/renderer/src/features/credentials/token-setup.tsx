import { Button } from '@/components/ui/button'
import { SetupScreen } from '@/features/setup/setup-screen'
import { saveSetupStep } from '@/features/setup/setup-progress'
import { SportmonksTokenForm } from './sportmonks-token-form'

export function TokenSetup({ onCancel }: { onCancel?: () => void }): React.JSX.Element {
  return (
    <SetupScreen
      title="Connect Sportmonks"
      description="Halfspace uses your Sportmonks account to bring football to your workspace."
      step={1}
      focusHeading={false}
    >
      <div className="rounded-xl bg-card p-4 text-sm leading-relaxed">
        Create an API token in your MySportmonks account settings, then paste it below.
        <a
          href="https://my.sportmonks.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 block w-fit rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open MySportmonks ↗
        </a>
      </div>
      <SportmonksTokenForm
        autoFocus
        buttonLabel="Continue"
        beforeSave={() => saveSetupStep('competitions')}
      />
      <p className="text-xs text-muted-foreground">Your token is stored securely on this device.</p>
      {onCancel && (
        <Button variant="ghost" onClick={onCancel}>
          Back
        </Button>
      )}
    </SetupScreen>
  )
}
