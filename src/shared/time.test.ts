import { describe, expect, test } from 'vitest'
import { sameLocalDay } from './time'

describe('sameLocalDay', () => {
  test('mesmo dia no fuso local', () => {
    expect(
      sameLocalDay(
        new Date('2026-11-14T00:05:00-03:00').getTime(),
        new Date('2026-11-14T23:55:00-03:00').getTime()
      )
    ).toBe(true)
  })

  test('dias diferentes no fuso local, mesmo que no mesmo dia UTC', () => {
    expect(
      sameLocalDay(
        new Date('2026-11-14T23:30:00-03:00').getTime(),
        new Date('2026-11-15T00:10:00-03:00').getTime()
      )
    ).toBe(false)
  })
})
