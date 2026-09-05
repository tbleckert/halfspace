import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/competitions_/$competitionId/referees')({
  component: () => null
})
