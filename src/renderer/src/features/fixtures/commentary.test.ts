import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  clearSportmonksCache,
  db,
  readFixtureCommentary,
  writeFixtureCommentaryRefresh,
  writeFixtureDetailRefresh
} from '@/data/db'
import { commentaryMinute, sortedCommentaries } from './commentary-data'

beforeEach(() => clearSportmonksCache())
afterAll(() => db.close())

describe('commentary', () => {
  const comment = {
    id: 1,
    fixture_id: 50,
    comment: 'Kick-off',
    minute: null,
    extra_minute: null,
    is_goal: false,
    is_important: false,
    order: 1
  }
  it('uses provider order, including phase messages without a minute', () => {
    const comments = [
      comment,
      { ...comment, id: 2, minute: 90, order: 2 },
      { ...comment, id: 3, comment: 'Full time', order: 3 }
    ]
    expect(sortedCommentaries(comments, false).map((item) => item.id)).toEqual([3, 2, 1])
    expect(
      sortedCommentaries([...comments, { ...comment, id: 4, is_goal: true, order: 4 }], true).map(
        (item) => item.id
      )
    ).toEqual([4])
    expect(commentaryMinute({ minute: 90, extra_minute: 4 })).toBe('90+4′')
    expect(commentaryMinute(comment)).toBe('—')
  })
  it('caches complete commentary per fixture and refreshes ongoing games every 30 seconds', async () => {
    const fetchedAt = Date.now()
    await writeFixtureDetailRefresh({
      fetchedAt,
      fixture: {
        id: 50,
        league_id: 8,
        season_id: 1,
        state_id: 2,
        placeholder: false,
        has_odds: false,
        participants: [],
        scores: []
      }
    })
    await writeFixtureCommentaryRefresh(50, { fetchedAt, commentaries: [comment] })
    const cached = await readFixtureCommentary(50)
    expect(cached?.commentaries).toEqual([comment])
    expect(cached?.staleAt).toBe(fetchedAt + 30_000)
    expect(await readFixtureCommentary(51)).toBeNull()
    await clearSportmonksCache()
    expect(await readFixtureCommentary(50)).toBeNull()
  })
})
