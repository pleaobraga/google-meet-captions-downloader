import { describe, expect, test } from 'vitest'
import { DIAGNOSTIC_MAX_EVENTS, DiagnosticRecorder } from './diagnostics'

const meta = {
  meetingId: 'm',
  code: 'abc-defg-hij',
  startedAt: 0,
  userAgent: 'ua',
  language: 'pt-BR',
}

describe('DiagnosticRecorder', () => {
  test('numera as chaves de forma estável e guarda o html quando o conjunto muda', () => {
    const region = document.createElement('div')
    region.innerHTML = '<p>x</p>'
    const k1 = {}
    const k2 = {}
    const rec = new DiagnosticRecorder(meta)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi' }], region, 'on', 1)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi gente' }], region, 'on', 2)
    rec.record(
      [
        { key: k1, speaker: 'Ana', text: 'oi gente' },
        { key: k2, speaker: 'Pedro', text: 'olá' },
      ],
      region,
      'on',
      3
    )
    expect(rec.toLog().events).toEqual([
      { t: 1, kind: 'html', html: '<div><p>x</p></div>' },
      { t: 1, kind: 'blocks', blocks: [{ k: 1, speaker: 'Ana', text: 'oi' }] },
      {
        t: 2,
        kind: 'blocks',
        blocks: [{ k: 1, speaker: 'Ana', text: 'oi gente' }],
      },
      { t: 3, kind: 'html', html: '<div><p>x</p></div>' },
      {
        t: 3,
        kind: 'blocks',
        blocks: [
          { k: 1, speaker: 'Ana', text: 'oi gente' },
          { k: 2, speaker: 'Pedro', text: 'olá' },
        ],
      },
    ])
  })

  test('não repete eventos idênticos', () => {
    const k1 = {}
    const rec = new DiagnosticRecorder(meta)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi' }], null, 'on', 1)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi' }], null, 'on', 2)
    rec.record(null, null, 'off', 3)
    rec.record(null, null, 'off', 4)
    expect(rec.toLog().events).toEqual([
      { t: 1, kind: 'blocks', blocks: [{ k: 1, speaker: 'Ana', text: 'oi' }] },
      { t: 3, kind: 'state', state: 'region-missing:off' },
    ])
  })

  test('continua a numeração de um log existente', () => {
    const existing = {
      ...meta,
      truncated: false,
      events: [
        {
          t: 1,
          kind: 'blocks' as const,
          blocks: [{ k: 7, speaker: 'Ana', text: 'oi' }],
        },
      ],
    }
    const rec = new DiagnosticRecorder(meta, existing)
    rec.record([{ key: {}, speaker: 'Pedro', text: 'olá' }], null, 'on', 2)
    expect(rec.toLog().events.at(-1)).toEqual({
      t: 2,
      kind: 'blocks',
      blocks: [{ k: 8, speaker: 'Pedro', text: 'olá' }],
    })
  })

  test('para de gravar no limite e marca como truncado', () => {
    const rec = new DiagnosticRecorder(meta)
    const key = {}
    for (let i = 0; i <= DIAGNOSTIC_MAX_EVENTS; i++) {
      rec.record([{ key, speaker: 'Ana', text: `t${i}` }], null, 'on', i)
    }
    const result = rec.toLog()
    expect(result.events).toHaveLength(DIAGNOSTIC_MAX_EVENTS)
    expect(result.truncated).toBe(true)
  })
})
