import { expect, it } from 'vitest'
import { expectedMetricRows, predictionGroups } from './fixture-analysis-data'

it('formats xG without converting unknown values to zero or rounding stored data', () => {
  const values = [
    {
      id: 1,
      fixture_id: 10,
      type_id: 5304,
      participant_id: 1,
      location: 'home' as const,
      data: { value: 2.7533 }
    },
    {
      id: 2,
      fixture_id: 10,
      type_id: 5305,
      participant_id: 1,
      location: 'home' as const,
      data: { value: 0 }
    }
  ]
  expect(expectedMetricRows(values)).toMatchObject([
    { id: 5304, home: '2.75', away: null },
    { id: 5305, home: '0.00', away: null }
  ])
  expect(values[0].data.value).toBe(2.7533)
})

it('preserves provider probabilities and missing outcomes without reweighting them', () => {
  const groups = predictionGroups(
    [{ id: 1, fixture_id: 10, type_id: 237, predictions: { home: 0, away: 70 } }],
    'Home club',
    'Away club'
  )
  expect(groups).toEqual([
    {
      id: 237,
      label: 'Match result',
      outcomes: [
        { label: 'Home club', probability: 0 },
        { label: 'Away club', probability: 70 }
      ]
    }
  ])
})

it('keeps correct-score outcomes complete, including other home, away and draw outcomes', () => {
  const groups = predictionGroups(
    [
      {
        id: 1,
        fixture_id: 10,
        type_id: 240,
        predictions: { scores: { '1-0': 10, Other_1: 30, Other_2: 20, Other_X: 0 } }
      }
    ],
    'Home',
    'Away'
  )
  expect(groups[0].outcomes).toEqual([
    { label: 'Other home win', probability: 30 },
    { label: 'Other away win', probability: 20 },
    { label: '1-0', probability: 10 },
    { label: 'Other draw', probability: 0 }
  ])
})
