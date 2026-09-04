import { expect, it } from 'vitest'
import { newsParagraphs } from './news-data'
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
