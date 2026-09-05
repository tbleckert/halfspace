import { expect, it } from 'vitest'
import { rumourAmount, rumourSourceUrl } from './rumour-display'

it('only presents reported fees with an explicit currency', () => {
  expect(rumourAmount({ amount: 100, currency: 'EUR' })).toBe('100 EUR')
  expect(rumourAmount({ amount: 0, currency: 'EUR' })).toBe('0 EUR')
  expect(rumourAmount({ amount: 100, currency: null })).toBeNull()
  expect(rumourAmount({ amount: null, currency: 'EUR' })).toBeNull()
  expect(rumourAmount({ amount: 100, currency: '?' })).toBeNull()
})

it('links only to web sources', () => {
  expect(rumourSourceUrl('https://example.com/report')).toBe('https://example.com/report')
  expect(rumourSourceUrl('javascript:alert(1)')).toBeNull()
  expect(rumourSourceUrl('file:///private/report')).toBeNull()
  expect(rumourSourceUrl('invalid')).toBeNull()
})
