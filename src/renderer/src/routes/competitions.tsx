import { createFileRoute } from '@tanstack/react-router'
import { CompetitionsPage } from '@/features/competitions/competitions-page'

export const Route = createFileRoute('/competitions')({
  component: CompetitionsPage
})
