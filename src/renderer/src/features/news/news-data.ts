import type { SportmonksNewsArticle } from '@shared/contracts'

export function sortNewsByMatchDate(articles: SportmonksNewsArticle[]): SportmonksNewsArticle[] {
  return articles.toSorted(
    (a, b) =>
      (b.fixture?.starting_at ?? '').localeCompare(a.fixture?.starting_at ?? '') || b.id - a.id
  )
}

export function newsParagraphs(article: SportmonksNewsArticle): string[] {
  return article.lines
    .toSorted((a, b) => a.id - b.id)
    .flatMap((line) =>
      line.text
        .split(/\n\s*\n/)
        .map((text) => text.trim())
        .filter(Boolean)
    )
}
