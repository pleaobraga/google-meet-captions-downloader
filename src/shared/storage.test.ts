import { describe, expect, test, vi } from 'vitest'
import { DEFAULT_SETTINGS } from './types'
import type { DiagnosticLog, LiveStatus, Meeting } from './types'
import {
  STORAGE_KEYS,
  clearLiveStatus,
  deleteMeeting,
  findLatestMeetingByCode,
  getDiagnostics,
  getLiveStatus,
  getMeeting,
  getSettings,
  listDiagnostics,
  listMeetings,
  onSettingsChange,
  saveDiagnostics,
  saveMeeting,
  setLiveStatus,
  updateSettings,
} from './storage'

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'abc-defg-hij_1000',
    code: 'abc-defg-hij',
    title: 'Daily',
    startedAt: 1000,
    sessions: [{ startedAt: 1000, endedAt: 5000 }],
    utterances: [
      { id: 'u1', speaker: 'Ana', startedAt: 1200, text: 'oi', final: true },
    ],
    ...overrides,
  }
}

function live(overrides: Partial<LiveStatus> = {}): LiveStatus {
  return {
    meetingId: 'abc-defg-hij_1000',
    code: 'abc-defg-hij',
    title: 'Daily',
    since: 1000,
    heartbeatAt: 10_000,
    state: 'recording',
    utteranceCount: 1,
    tabToken: 'tab-1',
    ...overrides,
  }
}

describe('settings', () => {
  test('usa os valores padrão quando não há nada salvo', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  test('updateSettings mescla e salva', async () => {
    expect(await updateSettings({ diagnostics: true })).toEqual({
      ...DEFAULT_SETTINGS,
      diagnostics: true,
    })
    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      diagnostics: true,
    })
  })

  test('onSettingsChange avisa com as configurações completas', async () => {
    const cb = vi.fn()
    const unsubscribe = onSettingsChange(cb)
    await updateSettings({ enabled: false })
    await vi.waitFor(() =>
      expect(cb).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, enabled: false })
    )
    unsubscribe()
  })
})

describe('meetings', () => {
  test('saveMeeting grava a reunião e o índice', async () => {
    await saveMeeting(meeting())
    expect(await getMeeting('abc-defg-hij_1000')).toEqual(meeting())
    expect(await listMeetings()).toEqual([
      {
        id: 'abc-defg-hij_1000',
        code: 'abc-defg-hij',
        title: 'Daily',
        customTitle: undefined,
        startedAt: 1000,
        endedAt: 5000,
        durationMs: 4000,
        utteranceCount: 1,
        legacy: undefined,
      },
    ])
  })

  test('listMeetings ordena da mais recente para a mais antiga', async () => {
    await saveMeeting(meeting({ id: 'a', startedAt: 1000 }))
    await saveMeeting(meeting({ id: 'b', startedAt: 3000 }))
    await saveMeeting(meeting({ id: 'c', startedAt: 2000 }))
    expect((await listMeetings()).map((m) => m.id)).toEqual(['b', 'c', 'a'])
  })

  test('salvar de novo atualiza a entrada do índice sem duplicar', async () => {
    await saveMeeting(meeting())
    await saveMeeting(meeting({ title: 'Novo' }))
    const list = await listMeetings()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('Novo')
  })

  test('findLatestMeetingByCode devolve a mais recente com o código', async () => {
    await saveMeeting(meeting({ id: 'a', startedAt: 1000 }))
    await saveMeeting(meeting({ id: 'b', startedAt: 3000 }))
    await saveMeeting(
      meeting({ id: 'x', code: 'zzz-zzzz-zzz', startedAt: 9000 })
    )
    expect((await findLatestMeetingByCode('abc-defg-hij'))?.id).toBe('b')
    expect(await findLatestMeetingByCode('nao-exis-tee')).toBeUndefined()
  })

  test('deleteMeeting apaga reunião, índice e diagnóstico', async () => {
    await saveMeeting(meeting())
    await saveDiagnostics(diagLog())
    await deleteMeeting('abc-defg-hij_1000')
    expect(await getMeeting('abc-defg-hij_1000')).toBeUndefined()
    expect(await listMeetings()).toEqual([])
    expect(await getDiagnostics('abc-defg-hij_1000')).toBeUndefined()
  })
})

describe('live status', () => {
  test('devolve o status quando o heartbeat é recente', async () => {
    await setLiveStatus(live())
    expect(await getLiveStatus(10_000 + 44_000)).toEqual(live())
  })

  test('ignora status com heartbeat mais antigo que 45s', async () => {
    await setLiveStatus(live())
    expect(await getLiveStatus(10_000 + 45_001)).toBeUndefined()
  })

  test('clearLiveStatus com token só apaga se for da mesma aba', async () => {
    await setLiveStatus(live())
    await clearLiveStatus('outra-aba')
    expect(await getLiveStatus(10_000)).toBeDefined()
    await clearLiveStatus('tab-1')
    expect(await getLiveStatus(10_000)).toBeUndefined()
  })

  test('clearLiveStatus sem token sempre apaga', async () => {
    await setLiveStatus(live())
    await clearLiveStatus()
    expect(await getLiveStatus(10_000)).toBeUndefined()
  })
})

function diagLog(): DiagnosticLog {
  return {
    meetingId: 'abc-defg-hij_1000',
    code: 'abc-defg-hij',
    startedAt: 1000,
    userAgent: 'ua',
    language: 'pt-BR',
    truncated: false,
    events: [{ t: 1, kind: 'state', state: 'x' }],
  }
}

describe('diagnostics', () => {
  test('salva, lê e lista logs', async () => {
    await saveDiagnostics(diagLog())
    expect(await getDiagnostics('abc-defg-hij_1000')).toEqual(diagLog())
    expect(await listDiagnostics()).toEqual([
      {
        meetingId: 'abc-defg-hij_1000',
        code: 'abc-defg-hij',
        startedAt: 1000,
        eventCount: 1,
        truncated: false,
      },
    ])
  })

  test('as chaves seguem o padrão', () => {
    expect(STORAGE_KEYS.meeting('x')).toBe('meeting:x')
    expect(STORAGE_KEYS.diagnostics('x')).toBe('diagnostics:x')
  })
})
