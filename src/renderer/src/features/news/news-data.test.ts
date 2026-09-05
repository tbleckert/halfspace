import { expect, it } from 'vitest'
import type { SportmonksNewsArticle } from '@shared/contracts'
import { newsParagraphs, sortNewsByMatchDate } from './news-data'

it('sorts dated articles newest first and leaves missing match dates last', () => {
  const article: SportmonksNewsArticle = {
    id: 1,
    fixture_id: 10,
    league_id: 8,
    title: 'Preview',
    type: 'prematch',
    lines: []
  }
  const fixture = {
    id: 10,
    league_id: 8,
    season_id: 12,
    state_id: 1,
    placeholder: false,
    has_odds: false,
    participants: [],
    scores: []
  }
  const articles = [
    { ...article, id: 99 },
    { ...article, id: 4, fixture: { ...fixture, starting_at: '2026-09-03 20:00:00' } },
    { ...article, id: 2, fixture: { ...fixture, starting_at: '2026-09-04 18:00:00' } },
    { ...article, id: 3, fixture: { ...fixture, starting_at: '2026-09-04 20:00:00' } },
    { ...article, id: 1, fixture: { ...fixture, starting_at: null } }
  ]

  expect(sortNewsByMatchDate(articles).map(({ id }) => id)).toEqual([3, 2, 4, 99, 1])
  expect(articles.map(({ id }) => id)).toEqual([99, 4, 2, 3, 1])
})

it('orders paragraphs by provider line identity and preserves text without interpreting HTML', () => {
  expect(
    newsParagraphs({
      id: 1,
      fixture_id: 10,
      league_id: 8,
      title: 'Preview',
      type: 'prematch',
      lines: [
        { id: 2, newsitem_id: 1, type: 'away', text: 'Away paragraph' },
        {
          id: 1,
          newsitem_id: 1,
          type: 'home',
          text: 'Kickoff\n\nHome <strong>literal text</strong>'
        }
      ]
    })
  ).toEqual(['Kickoff', 'Home <strong>literal text</strong>', 'Away paragraph'])
})
