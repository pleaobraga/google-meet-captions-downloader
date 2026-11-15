import { expect, test } from 'vitest'
import {
  getMeeting,
  getStoppedCodes,
  onStorageKeysChange,
  saveMeeting,
  setLiveStatus,
} from '@/shared/storage'
import type { LiveStatus, Meeting } from '@/shared/types'
import { stopRecordingThisMeeting } from './stop-recording'

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

const live = (
  state: LiveStatus['state'],
  meetingId: string | null
): LiveStatus => ({
  meetingId,
  code: 'abc-defg-hij',
  title: 'Daily',
  since: Date.now(),
  heartbeatAt: Date.now(),
  state,
  utteranceCount: 1,
  tabToken: 'tab-1',
})

async function simulateTab() {
  await saveMeeting(meeting)
  await setLiveStatus(live('recording', 'm1'))
  onStorageKeysChange(['recordingStops'], () => {
    setTimeout(() => void setLiveStatus(live('stopped', null)), 50)
  })
}

test('parar mantendo a gravação', async () => {
  await simulateTab()
  await stopRecordingThisMeeting({
    code: 'abc-defg-hij',
    meetingId: 'm1',
    discard: false,
  })
  expect(await getStoppedCodes(Date.now())).toEqual(['abc-defg-hij'])
  expect(await getMeeting('m1')).toBeDefined()
})

test('parar descartando a gravação', async () => {
  await simulateTab()
  await stopRecordingThisMeeting({
    code: 'abc-defg-hij',
    meetingId: 'm1',
    discard: true,
  })
  expect(await getMeeting('m1')).toBeUndefined()
})
