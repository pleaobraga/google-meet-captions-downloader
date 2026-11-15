import { describe, expect, test } from 'vitest'
import { saveMeeting } from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import {
  countMatches,
  meetingMatches,
  searchMeetingIds,
  splitHighlight,
} from './search'

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    code: 'abc-defg-hij',
    title: 'Daily do time',
    startedAt: 1000,
    sessions: [{ startedAt: 1000, endedAt: 2000 }],
    utterances: [
      {
        id: 'u1',
        speaker: 'João',
        startedAt: 1100,
        text: 'A reunião é na sexta',
        final: true,
      },
    ],
    ...overrides,
  }
}

describe('splitHighlight', () => {
  test('ignora acentos e maiúsculas, devolvendo o texto original', () => {
    expect(splitHighlight('Reunião de sexta', 'reuniao')).toEqual([
      { text: 'Reunião', match: true },
      { text: ' de sexta', match: false },
    ])
  })

  test('marca todas as ocorrências', () => {
    expect(splitHighlight('a sexta e a SEXTA', 'sexta')).toEqual([
      { text: 'a ', match: false },
      { text: 'sexta', match: true },
      { text: ' e a ', match: false },
      { text: 'SEXTA', match: true },
    ])
    expect(countMatches('a sexta e a SEXTA', 'sexta')).toBe(2)
  })

  test('consulta vazia ou sem ocorrência devolve o texto inteiro sem marca', () => {
    expect(splitHighlight('bom dia', '  ')).toEqual([
      { text: 'bom dia', match: false },
    ])
    expect(splitHighlight('bom dia', 'xyz')).toEqual([
      { text: 'bom dia', match: false },
    ])
    expect(countMatches('bom dia', 'xyz')).toBe(0)
  })
})

describe('meetingMatches', () => {
  test.each([
    ['', true],
    ['daily', true],
    ['joao', true],
    ['REUNIAO', true],
    ['abc-defg', true],
    ['inexistente', false],
  ])('consulta %j -> %s', (query, expected) => {
    expect(meetingMatches(meeting(), query)).toBe(expected)
  })

  test('procura também no título que eu dei', () => {
    expect(
      meetingMatches(meeting({ customTitle: 'Planejamento' }), 'planeja')
    ).toBe(true)
  })
})

describe('searchMeetingIds', () => {
  test('devolve os ids das reuniões que casam', async () => {
    await saveMeeting(meeting({ id: 'a' }))
    await saveMeeting(meeting({ id: 'b', title: 'Outra', utterances: [] }))
    expect(await searchMeetingIds('sexta')).toEqual(new Set(['a']))
  })
})
