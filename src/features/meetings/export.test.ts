import { describe, expect, test } from 'vitest'
import type { Meeting } from '@/shared/types'
import { buildExport, exportFilename } from './export'

const at = (iso: string) => new Date(iso).getTime()

const meeting: Meeting = {
  id: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily do time',
  startedAt: at('2026-11-14T10:00:00-03:00'),
  sessions: [
    {
      startedAt: at('2026-11-14T10:00:00-03:00'),
      endedAt: at('2026-11-14T10:20:00-03:00'),
    },
    {
      startedAt: at('2026-11-14T14:05:00-03:00'),
      endedAt: at('2026-11-14T14:30:00-03:00'),
    },
  ],
  utterances: [
    {
      id: 'u1',
      speaker: 'Pedro',
      startedAt: at('2026-11-14T10:02:00-03:00'),
      text: 'bom dia',
      final: true,
    },
    {
      id: 'u2',
      speaker: 'Ana',
      startedAt: at('2026-11-14T14:06:00-03:00'),
      text: 'boa tarde',
      final: true,
    },
  ],
}

describe('buildExport', () => {
  test('markdown', () => {
    expect(buildExport(meeting, 'md', '')).toBe(
      [
        '# Daily do time',
        '',
        '- **Data:** 14/11/2026',
        '- **Horário:** 10:00–14:30',
        '- **Participantes:** Pedro, Ana',
        '',
        '**10:02 Pedro:** bom dia',
        '',
        '_Saiu às 10:20 · voltou às 14:05_',
        '',
        '**14:06 Ana:** boa tarde',
        '',
      ].join('\n')
    )
  })

  test('texto puro', () => {
    expect(buildExport(meeting, 'txt', '')).toBe(
      [
        'Daily do time',
        'Data: 14/11/2026',
        'Horário: 10:00–14:30',
        'Participantes: Pedro, Ana',
        '',
        '10:02 Pedro: bom dia',
        '',
        '--- Saiu às 10:20 · voltou às 14:05 ---',
        '',
        '14:06 Ana: boa tarde',
        '',
      ].join('\n')
    )
  })

  test('usa meu nome e trata fala sem nome', () => {
    const m: Meeting = {
      ...meeting,
      sessions: [meeting.sessions[0]],
      utterances: [
        {
          id: 'u1',
          speaker: 'Você',
          startedAt: at('2026-11-14T10:02:00-03:00'),
          text: 'oi',
          final: true,
        },
        {
          id: 'u2',
          speaker: '',
          startedAt: at('2026-11-14T10:03:00-03:00'),
          text: 'sem nome',
          final: true,
        },
      ],
    }
    const md = buildExport(m, 'md', 'Maria')
    expect(md).toContain('- **Participantes:** Maria')
    expect(md).toContain('**10:02 Maria:** oi')
    expect(md).toContain('**10:03** sem nome')
    expect(buildExport(m, 'txt', 'Maria')).toContain('10:03 sem nome')
  })

  test('sem participantes, omite a linha', () => {
    const m: Meeting = { ...meeting, utterances: [] }
    expect(buildExport(m, 'txt', '')).not.toContain('Participantes')
  })
})

describe('exportFilename', () => {
  test('data e título', () => {
    expect(exportFilename(meeting, 'md')).toBe('2026-11-14 Daily do time.md')
  })

  test('remove caracteres inválidos e usa o título que eu dei', () => {
    expect(
      exportFilename(
        { ...meeting, customTitle: 'Plano: Q1/Q2  "final"?' },
        'txt'
      )
    ).toBe('2026-11-14 Plano Q1Q2 final.txt')
  })

  test('título vazio depois de limpar vira Reunião', () => {
    expect(exportFilename({ ...meeting, customTitle: '???' }, 'md')).toBe(
      '2026-11-14 Reunião.md'
    )
  })
})
