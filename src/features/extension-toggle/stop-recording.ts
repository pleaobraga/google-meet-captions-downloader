import { deleteMeeting, getLiveStatus, stopRecording } from '@/shared/storage'
import { DISABLE_WAIT_MS } from './disable-extension'

const POLL_INTERVAL_MS = 100

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Para de gravar só esta reunião (R3.9). Espera a aba do Meet parar antes de
 * apagar, para a reunião descartada não reaparecer.
 */
export async function stopRecordingThisMeeting(options: {
  code: string
  meetingId: string | null
  discard: boolean
}): Promise<void> {
  await stopRecording(options.code, Date.now())

  const deadline = Date.now() + DISABLE_WAIT_MS
  while (Date.now() < deadline) {
    const live = await getLiveStatus()
    if (!live || live.state === 'stopped') break
    await sleep(POLL_INTERVAL_MS)
  }

  if (options.discard && options.meetingId) {
    await deleteMeeting(options.meetingId)
  }
}
