import { describe, expect, test } from 'vitest'
import type { MeetingSummary } from '@/shared/types'
import { idsBefore, pluralMeetings } from './bulk-delete'

const at = (iso: string) => new Date(iso).getTime()
const s = (id: string, iso: string): MeetingSummary => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: at(iso),
  endedAt: at(iso),
  durationMs: 0,
  utteranceCount: 1,
})

const list = [
  s('novembro-14', '2026-11-14T10:00:00-03:00'),
  s('novembro-13-noite', '2026-11-13T23:59:00-03:00'),
  s('novembro-10', '2026-11-10T10:00:00-03:00'),
]

describe('idsBefore', () => {
  test('usa a meia-noite local da data escolhida', () => {
    expect(idsBefore(list, '2026-11-14', null)).toEqual([
      'novembro-13-noite',
      'novembro-10',
    ])
  })

  test('nunca inclui a reunião ao vivo', () => {
    expect(idsBefore(list, '2026-11-14', 'novembro-10')).toEqual([
      'novembro-13-noite',
    ])
  })

  test('data vazia ou inválida não apaga nada', () => {
    expect(idsBefore(list, '', null)).toEqual([])
    expect(idsBefore(list, 'abc', null)).toEqual([])
  })
})

test('pluralMeetings', () => {
  expect(pluralMeetings(1)).toBe('1 reunião')
  expect(pluralMeetings(3)).toBe('3 reuniões')
})
