import { describe, expect, test } from 'vitest'
import type { MeetingSummary } from '@/shared/types'
import { parseMeetingCode, shouldContinueMeeting } from './meeting-identity'

const at = (iso: string) => new Date(iso).getTime()

function summary(startedAt: number, endedAt: number): MeetingSummary {
  return {
    id: 'x',
    code: 'abc-defg-hij',
    title: '',
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    utteranceCount: 3,
  }
}

describe('parseMeetingCode', () => {
  test.each([
    ['https://meet.google.com/abc-defg-hij', 'abc-defg-hij'],
    [
      'https://meet.google.com/abc-defg-hij?authuser=1&hl=pt-BR',
      'abc-defg-hij',
    ],
    ['https://meet.google.com/abc-defg-hij#x', 'abc-defg-hij'],
    ['http://localhost:3000/abc-defg-hij', 'abc-defg-hij'],
  ])('%s -> %s', (url, code) => {
    expect(parseMeetingCode(url)).toBe(code)
  })

  test.each([
    'https://meet.google.com/',
    'https://meet.google.com/landing',
    'https://meet.google.com/lookup/abcdef',
    'https://meet.google.com/ABC-DEFG-HIJ',
    'não é url',
  ])('%s -> null', (url) => {
    expect(parseMeetingCode(url)).toBeNull()
  })
})

describe('shouldContinueMeeting', () => {
  test('sem reunião anterior: cria nova', () => {
    expect(
      shouldContinueMeeting(undefined, at('2026-11-14T10:00:00-03:00'))
    ).toBe(false)
  })

  test('mesmo link no mesmo dia, horas depois: continua', () => {
    const prev = summary(
      at('2026-11-14T09:00:00-03:00'),
      at('2026-11-14T09:30:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-14T14:05:00-03:00'))).toBe(
      true
    )
  })

  test('mesmo link em outro dia: cria nova', () => {
    const prev = summary(
      at('2026-11-13T09:00:00-03:00'),
      at('2026-11-13T09:30:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-14T09:00:00-03:00'))).toBe(
      false
    )
  })

  test('reunião que passou da meia-noite, voltando 5 min depois: continua', () => {
    const prev = summary(
      at('2026-11-14T23:30:00-03:00'),
      at('2026-11-15T00:05:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-15T00:10:00-03:00'))).toBe(
      true
    )
  })

  test('outro dia e saiu há mais de 15 min: cria nova', () => {
    const prev = summary(
      at('2026-11-14T23:30:00-03:00'),
      at('2026-11-14T23:50:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-15T00:10:00-03:00'))).toBe(
      false
    )
  })
})
