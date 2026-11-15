import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getLiveStatus,
  getMeeting,
  listMeetings,
  saveMeeting,
  setLiveStatus,
} from '@/shared/storage'
import type { Meeting, ObservedBlock } from '@/shared/types'
import { HEARTBEAT_MS, Recorder, UNAVAILABLE_AFTER_MS } from './recorder'

const CODE = 'abc-defg-hij'
const at = (iso: string) => new Date(iso).getTime()
let n = 0

function createRecorder(tabToken = 'tab-1', diagnostics = false) {
  return new Recorder({
    now: () => Date.now(),
    createId: () => `u${++n}`,
    tabToken,
    diagnosticsEnabled: () => diagnostics,
    userAgent: 'ua',
    language: 'pt-BR',
  })
}

const key = {}
const blocks = (text: string): ObservedBlock[] => [
  { key, speaker: 'Ana', text },
]

describe('Recorder', () => {
  beforeEach(() => {
    n = 0
    vi.useFakeTimers()
    vi.setSystemTime(at('2026-11-14T10:00:00-03:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('não cria reunião antes da primeira fala', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await listMeetings()).toEqual([])
    expect((await getLiveStatus())?.meetingId).toBeNull()
  })

  test('salva as falas no máximo uma vez por segundo', async () => {
    const setSpy = vi.spyOn(chrome.storage.local, 'set')
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    for (let i = 1; i <= 10; i++) {
      recorder.observe(blocks(`bom dia ${'pessoal '.repeat(i)}`), 'on', null)
      await vi.advanceTimersByTimeAsync(90)
    }
    await vi.advanceTimersByTimeAsync(1_000)
    const meetingWrites = setSpy.mock.calls.filter(([items]) =>
      Object.keys(items).some((k) => k.startsWith('meeting:'))
    )
    expect(meetingWrites.length).toBeLessThanOrEqual(2)
    const [summary] = await listMeetings()
    const saved = await getMeeting(summary.id)
    expect(saved?.utterances[0].text).toBe(
      `bom dia ${'pessoal '.repeat(10)}`.trim()
    )
  })

  test('cria a reunião com o id código_início e status ao vivo', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await vi.advanceTimersByTimeAsync(1_000)
    const id = `${CODE}_${at('2026-11-14T10:00:00-03:00')}`
    expect((await getMeeting(id))?.title).toBe('Daily')
    expect((await getLiveStatus())?.meetingId).toBe(id)
  })

  test('continua a reunião do mesmo dia com uma nova sessão', async () => {
    const previous: Meeting = {
      id: `${CODE}_1`,
      code: CODE,
      title: 'Daily',
      startedAt: at('2026-11-14T09:00:00-03:00'),
      sessions: [
        {
          startedAt: at('2026-11-14T09:00:00-03:00'),
          endedAt: at('2026-11-14T09:30:00-03:00'),
        },
      ],
      utterances: [
        {
          id: 'old',
          speaker: 'Pedro',
          startedAt: 1,
          text: 'antes',
          final: true,
        },
      ],
    }
    await saveMeeting(previous)
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('depois'), 'on', null)
    await vi.advanceTimersByTimeAsync(1_000)
    const saved = await getMeeting(`${CODE}_1`)
    expect(saved?.sessions).toHaveLength(2)
    expect(saved?.utterances.map((u) => u.text)).toEqual(['antes', 'depois'])
    expect(await listMeetings()).toHaveLength(1)
  })

  test('cria reunião nova quando a anterior é de outro dia', async () => {
    await saveMeeting({
      id: `${CODE}_1`,
      code: CODE,
      title: 'Daily',
      startedAt: at('2026-11-13T09:00:00-03:00'),
      sessions: [
        {
          startedAt: at('2026-11-13T09:00:00-03:00'),
          endedAt: at('2026-11-13T09:30:00-03:00'),
        },
      ],
      utterances: [
        {
          id: 'old',
          speaker: 'Pedro',
          startedAt: 1,
          text: 'ontem',
          final: true,
        },
      ],
    })
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('hoje'), 'on', null)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(await listMeetings()).toHaveLength(2)
  })

  test('heartbeat atualiza o fim da sessão', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS + 1_000)
    const [summary] = await listMeetings()
    expect(summary.endedAt).toBeGreaterThanOrEqual(
      at('2026-11-14T10:00:15-03:00')
    )
  })

  test('leave fecha as falas, salva e limpa o status ao vivo', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await recorder.leave()
    const [summary] = await listMeetings()
    const saved = await getMeeting(summary.id)
    expect(saved?.utterances[0].final).toBe(true)
    expect(await getLiveStatus()).toBeUndefined()
    expect(recorder.active).toBe(false)
  })

  test('depois de leave, um salvamento pendente não acontece', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await recorder.leave()
    const [summary] = await listMeetings()
    await chrome.storage.local.remove(`meeting:${summary.id}`)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await getMeeting(summary.id)).toBeUndefined()
  })

  test('legendas desligadas por mim: estado captions-off', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(null, 'off', null)
    await vi.advanceTimersByTimeAsync(0)
    expect((await getLiveStatus())?.state).toBe('captions-off')
  })

  test('legendas sumindo por 20s sem motivo: estado captions-unavailable', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(null, 'unknown', null)
    await vi.advanceTimersByTimeAsync(UNAVAILABLE_AFTER_MS - 1)
    recorder.observe(null, 'unknown', null)
    await vi.advanceTimersByTimeAsync(0)
    expect((await getLiveStatus())?.state).toBe('recording')
    await vi.advanceTimersByTimeAsync(1)
    recorder.observe(null, 'unknown', null)
    await vi.advanceTimersByTimeAsync(0)
    expect((await getLiveStatus())?.state).toBe('captions-unavailable')
  })

  test('lembra que eu desliguei as legendas nesta reunião', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(null, 'off', null)
    expect(recorder.captionsOffByUser).toBe(false)
    recorder.observe(blocks('oi'), 'on', null)
    recorder.observe(null, 'off', null)
    expect(recorder.captionsOffByUser).toBe(true)
    await recorder.leave()

    const again = createRecorder()
    await again.join(CODE, 'Daily')
    expect(again.captionsOffByUser).toBe(true)
    again.observe(blocks('voltei'), 'on', null)
    expect(again.captionsOffByUser).toBe(false)
  })

  test('não grava se outra aba já grava a mesma reunião', async () => {
    await setLiveStatus({
      meetingId: null,
      code: CODE,
      title: 'Daily',
      since: Date.now(),
      heartbeatAt: Date.now(),
      state: 'recording',
      utteranceCount: 0,
      tabToken: 'outra-aba',
    })
    const recorder = createRecorder('tab-1')
    await recorder.join(CODE, 'Daily')
    expect(recorder.blocked).toBe(true)
    recorder.observe(blocks('oi'), 'on', null)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(await listMeetings()).toEqual([])
    expect((await getLiveStatus())?.tabToken).toBe('outra-aba')
  })

  test('com diagnóstico ligado, salva o log mesmo sem falas', async () => {
    const recorder = createRecorder('tab-1', true)
    await recorder.join(CODE, 'Daily')
    recorder.observe(null, 'unknown', null)
    await recorder.flush()
    const all = await chrome.storage.local.get(null)
    expect(Object.keys(all).some((k) => k.startsWith('diagnostics:'))).toBe(
      true
    )
    expect(await listMeetings()).toEqual([])
  })
})
