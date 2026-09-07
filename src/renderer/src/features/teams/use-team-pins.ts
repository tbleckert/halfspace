import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TeamPinRecord } from '@/data/db'

export function usePinnedTeams(): TeamPinRecord[] | undefined {
  return useLiveQuery(() => db.teamPins.orderBy('pinnedAt').toArray(), [])
}

export async function toggleTeamPin(team: {
  id: number
  name: string
  imagePath: string | null
}): Promise<void> {
  await db.transaction('rw', db.teamPins, async () => {
    if (await db.teamPins.get(team.id)) await db.teamPins.delete(team.id)
    else
      await db.teamPins.put({
        teamId: team.id,
        name: team.name,
        imagePath: team.imagePath,
        pinnedAt: Date.now()
      })
  })
}
