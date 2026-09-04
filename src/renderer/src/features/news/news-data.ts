import type { SportmonksNewsArticle } from '@shared/contracts'
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
