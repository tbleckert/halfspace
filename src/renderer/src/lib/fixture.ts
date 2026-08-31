import type { SportmonksFixture, SportmonksParticipant } from '@shared/contracts'

export function fixtureParticipantAt(
  fixture: Pick<SportmonksFixture, 'participants'>,
  location: 'home' | 'away'
): SportmonksParticipant | undefined {
  return fixture.participants.find((participant) => participant.meta?.location === location)
}

export function currentFixtureScore(fixture: Pick<SportmonksFixture, 'scores'>): {
  away: number | undefined
  home: number | undefined
} {
  const scores = fixture.scores.filter(({ description }) => description === 'CURRENT')

  return {
    away: scores.find(({ score }) => score.participant === 'away')?.score.goals,
    home: scores.find(({ score }) => score.participant === 'home')?.score.goals
  }
}
