import {
  clearLiveStatus,
  deleteMeeting,
  getLiveStatus,
  updateSettings,
} from '@/shared/storage'

export const DISABLE_WAIT_MS = 2_000
const POLL_INTERVAL_MS = 100

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Desliga a extensão. Espera a aba do Meet parar de gravar antes de apagar a
 * reunião, para ela não reaparecer num salvamento atrasado.
 */
export async function disableExtension(options: {
  discard: boolean
  meetingId: string | null
}): Promise<void> {
  await updateSettings({ enabled: false })

  const deadline = Date.now() + DISABLE_WAIT_MS
  while (Date.now() < deadline) {
    if (!(await getLiveStatus())) break
    await sleep(POLL_INTERVAL_MS)
  }

  await clearLiveStatus()
  if (options.discard && options.meetingId) {
    await deleteMeeting(options.meetingId)
  }
}
