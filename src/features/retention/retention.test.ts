import { describe, expect, test } from 'vitest'
import {
  getDiagnostics,
  listMeetings,
  saveDiagnostics,
  saveMeeting,
  setLiveStatus,
  updateSettings,
} from '@/shared/storage'
import type { Meeting, MeetingSummary } from '@/shared/types'
import { findExpiredMeetingIds, runRetention } from './retention'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-11-14T10:00:00-03:00').getTime()

const s = (id: string, daysAgo: number): MeetingSummary => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: NOW - daysAgo * DAY,
  endedAt: NOW - daysAgo * DAY,
  durationMs: 0,
  utteranceCount: 1,
})

const m = (id: string, daysAgo: number): Meeting => ({
  id,
  code: `cod-${id}`,
  title: id,
  startedAt: NOW - daysAgo * DAY,
  sessions: [{ startedAt: NOW - daysAgo * DAY, endedAt: NOW - daysAgo * DAY }],
  utterances: [
    {
      id: 'u',
      speaker: 'Ana',
      startedAt: NOW - daysAgo * DAY,
      text: 'oi',
      final: true,
    },
  ],
})

describe('findExpiredMeetingIds', () => {
  const list = [s('hoje', 0), s('d29', 29), s('d31', 31), s('d200', 200)]

  test('nunca: não apaga nada', () => {
    expect(findExpiredMeetingIds(list, 0, NOW, null)).toEqual([])
  })

  test('30 dias', () => {
    expect(findExpiredMeetingIds(list, 30, NOW, null)).toEqual(['d31', 'd200'])
  })

  test('180 dias', () => {
    expect(findExpiredMeetingIds(list, 180, NOW, null)).toEqual(['d200'])
  })

  test('nunca apaga a reunião ao vivo', () => {
    expect(findExpiredMeetingIds(list, 30, NOW, 'd200')).toEqual(['d31'])
  })
})

describe('runRetention', () => {
  test('com "nunca", não apaga', async () => {
    await saveMeeting(m('velha', 400))
    expect(await runRetention(NOW)).toBe(0)
    expect(await listMeetings()).toHaveLength(1)
  })

  test('apaga reuniões vencidas e os diagnósticos antigos', async () => {
    await updateSettings({ autoDeleteDays: 90 })
    await saveMeeting(m('nova', 10))
    await saveMeeting(m('velha', 100))
    const log = {
      meetingId: 'orfa',
      code: 'zzz-zzzz-zzz',
      startedAt: NOW - 100 * DAY,
      userAgent: '',
      language: '',
      truncated: false,
      events: [],
    }
    await saveDiagnostics(log)
    await saveDiagnostics({ ...log, meetingId: 'velha' })
    expect(await runRetention(NOW)).toBe(1)
    expect((await listMeetings()).map((x) => x.id)).toEqual(['nova'])
    expect(await getDiagnostics('velha')).toBeUndefined()
    expect(await getDiagnostics('orfa')).toBeUndefined()
  })

  test('não apaga a reunião que está sendo gravada', async () => {
    await updateSettings({ autoDeleteDays: 30 })
    await saveMeeting(m('velha', 100))
    await setLiveStatus({
      meetingId: 'velha',
      code: 'cod-velha',
      title: '',
      since: NOW,
      heartbeatAt: NOW,
      state: 'recording',
      utteranceCount: 1,
      tabToken: 't',
    })
    expect(await runRetention(NOW)).toBe(0)
    expect(await listMeetings()).toHaveLength(1)
  })
})
