// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { CachedFixture } from '@/data/db'
import { TvGuideFixtureRow } from './tv-guide-fixture-row'
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <a className={className}>{children}</a>
  )
}))
afterEach(cleanup)
it('places kickoff before teams without not-started labels or pre-match scores', () => {
  const fixture = {
    id: 1,
    stateId: 1,
    startingAt: Date.parse('2026-09-06T18:00:00Z'),
    raw: {
      state_id: 1,
      state: { short_name: 'NS', name: 'Not started' },
      participants: [
        { id: 1, name: 'Home club', meta: { location: 'home' } },
        { id: 2, name: 'Away club', meta: { location: 'away' } }
      ],
      scores: []
    }
  } as unknown as CachedFixture
  const { container } = render(
    <TvGuideFixtureRow fixture={fixture} date="2026-09-06" online={false} />
  )
  expect(screen.queryByText('NS')).toBeNull()
  expect(screen.queryByText('Not started')).toBeNull()
  const time = container.querySelector('time')!
  expect(time.getAttribute('datetime')).toBe('2026-09-06T18:00:00.000Z')
  expect(
    time.compareDocumentPosition(screen.getByText('Home club')) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
})
