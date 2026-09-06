import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Card } from '@/components/ui/card'

const MotionCard = motion.create(Card)
const MatchdayMotionContext = createContext(false)

export function MatchdayMotion({ children }: { children: ReactNode }): React.JSX.Element {
  const reducedMotion = useReducedMotion()
  const [keyboard, setKeyboard] = useState(
    () => document.activeElement?.matches(':focus-visible') ?? false
  )

  useEffect(() => {
    const onKeyDown = (): void => setKeyboard(true)
    const onPointerDown = (): void => setKeyboard(false)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [])

  return (
    <MatchdayMotionContext value={!reducedMotion && !keyboard}>{children}</MatchdayMotionContext>
  )
}

export function MatchdayCard({
  index = 0,
  ...props
}: {
  children: ReactNode
  className?: string
  index?: number
}): React.JSX.Element {
  const motionEnabled = useContext(MatchdayMotionContext)
  const delay = Math.min(index, 3) * 0.05

  return (
    <MotionCard
      {...props}
      initial={motionEnabled ? { scale: 0.95, opacity: 0 } : false}
      animate={motionEnabled ? undefined : { scale: 1, opacity: 1 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={
        motionEnabled
          ? {
              scale: { type: 'spring', bounce: 0.35, duration: 0.5, delay },
              opacity: { duration: 0.2, delay }
            }
          : { duration: 0 }
      }
    />
  )
}
