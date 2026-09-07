import { createFileRoute } from '@tanstack/react-router'
import { TeamsPage } from '@/features/teams/teams-page'

export const Route = createFileRoute('/teams')({ component: TeamsPage })
