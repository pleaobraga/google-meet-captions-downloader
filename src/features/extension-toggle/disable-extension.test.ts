import { describe, expect, test } from 'vitest'
import {
  clearLiveStatus,
  getMeeting,
  getSettings,
  onSettingsChange,
  saveMeeting,
  setLiveStatus,
} from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import { disableExtension } from './disable-extension'

const meeting: Meeting = {
  id: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily',
  startedAt: Date.now(),
  sessions: [{ startedAt: Date.now(), endedAt: Date.now() }],
  utterances: [
    {
      id: 'u1',
      speaker: 'Ana',
      startedAt: Date.now(),
      text: 'oi',
      final: true,
    },
  ],
}

async function simulateRecordingTab() {
  await saveMeeting(meeting)
  await setLiveStatus({
    meetingId: 'm1',
    code: 'abc-defg-hij',
    title: 'Daily',
    since: Date.now(),
    heartbeatAt: Date.now(),
    state: 'recording',
    utteranceCount: 1,
    tabToken: 'tab-1',
  })
  onSettingsChange((settings) => {
    if (!settings.enabled) setTimeout(() => void clearLiveStatus('tab-1'), 50)
  })
}

describe('disableExtension', () => {
  test('desliga e mantém a gravação', async () => {
    await simulateRecordingTab()
    await disableExtension({ discard: false, meetingId: 'm1' })
    expect((await getSettings()).enabled).toBe(false)
    expect(await getMeeting('m1')).toBeDefined()
  })

  test('desliga e descarta a gravação depois que a aba para', async () => {
    await simulateRecordingTab()
    await disableExtension({ discard: true, meetingId: 'm1' })
    expect(await getMeeting('m1')).toBeUndefined()
  })

  test('sem aba respondendo, termina depois do tempo limite', async () => {
    await saveMeeting(meeting)
    await setLiveStatus({
      meetingId: 'm1',
      code: 'abc-defg-hij',
      title: 'Daily',
      since: Date.now(),
      heartbeatAt: Date.now(),
      state: 'recording',
      utteranceCount: 1,
      tabToken: 'tab-travada',
    })
    await disableExtension({ discard: true, meetingId: 'm1' })
    expect(await getMeeting('m1')).toBeUndefined()
  }, 5_000)
})
