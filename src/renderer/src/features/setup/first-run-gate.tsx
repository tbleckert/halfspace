import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FirstRunSetup } from './first-run-setup'
import { readSetupStep, saveSetupStep } from './setup-progress'

export function FirstRunGate({ children }: { children: ReactNode }): React.JSX.Element {
  const [step, setStep] = useState(readSetupStep)
  const navigate = useNavigate()
  if (step === null || step === 'complete') return <>{children}</>

  return (
    <>
      <div aria-hidden="true" className="window-drag-region" />
      <FirstRunSetup
        initialStep={step}
        onComplete={async () => {
          await navigate({ to: '/', search: {}, replace: true })
          saveSetupStep('complete')
          setStep('complete')
        }}
      />
    </>
  )
}
