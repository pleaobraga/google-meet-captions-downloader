import { describe, expect, test } from 'vitest'
import {
  displayTitle,
  formatDate,
  formatDateTime,
  formatDuration,
  formatIsoDate,
  formatTime,
} from './format'

const at = (iso: string) => new Date(iso).getTime()

describe('format', () => {
  test('formatTime', () => {
    expect(formatTime(at('2026-11-14T10:02:59-03:00'))).toBe('10:02')
  })

  test('formatDateTime', () => {
    expect(formatDateTime(at('2026-11-14T10:02:00-03:00'))).toBe(
      '14/11/2026 10:02'
    )
  })

  test.each([
    [30_000, '0 min'],
    [32 * 60_000, '32 min'],
    [65 * 60_000, '1h 05min'],
  ])('formatDuration(%i) = %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })

  test('displayTitle', () => {
    expect(
      displayTitle({
        customTitle: 'Minha',
        title: 'Meet',
        code: 'abc-defg-hij',
      })
    ).toBe('Minha')
    expect(displayTitle({ title: 'Meet', code: 'abc-defg-hij' })).toBe('Meet')
    expect(displayTitle({ title: '', code: 'abc-defg-hij' })).toBe(
      'Reunião abc-defg-hij'
    )
    expect(displayTitle({ title: '', code: '' })).toBe('Reunião sem título')
  })

  test('formatDate e formatIsoDate', () => {
    expect(formatDate(at('2026-11-04T10:02:00-03:00'))).toBe('04/11/2026')
    expect(formatIsoDate(at('2026-11-04T10:02:00-03:00'))).toBe('2026-11-04')
  })
})
