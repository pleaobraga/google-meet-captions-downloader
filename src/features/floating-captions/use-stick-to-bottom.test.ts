import { expect, test } from 'vitest'
import { isNearBottom } from './use-stick-to-bottom'

test('isNearBottom', () => {
  expect(
    isNearBottom({ scrollHeight: 1000, scrollTop: 700, clientHeight: 300 })
  ).toBe(true)
  expect(
    isNearBottom({ scrollHeight: 1000, scrollTop: 665, clientHeight: 300 })
  ).toBe(true)
  expect(
    isNearBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 300 })
  ).toBe(false)
})
