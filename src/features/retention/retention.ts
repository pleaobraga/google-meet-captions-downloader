import {
  deleteDiagnostics,
  deleteMeetings,
  getLiveStatus,
  getSettings,
  listDiagnostics,
  listMeetings,
} from '@/shared/storage'
import type { AutoDeleteDays, MeetingSummary } from '@/shared/types'

export const AUTO_DELETE_OPTIONS: readonly AutoDeleteDays[] = [0, 30, 90, 180]
export const RETENTION_ALARM = 'retention'

const DAY_MS = 24 * 60 * 60 * 1000

function cutoffFor(days: AutoDeleteDays, now: number): number {
  return now - days * DAY_MS
}

export function findExpiredMeetingIds(
  summaries: MeetingSummary[],
  days: AutoDeleteDays,
  now: number,
  liveMeetingId: string | null
): string[] {
  if (days === 0) return []
  const cutoff = cutoffFor(days, now)
  return summaries
    .filter((s) => s.startedAt < cutoff && s.id !== liveMeetingId)
    .map((s) => s.id)
}

/** Apaga reuniões e diagnósticos mais antigos que o prazo escolhido (R7.2). */
export async function runRetention(now: number): Promise<number> {
  const { autoDeleteDays } = await getSettings()
  if (autoDeleteDays === 0) return 0

  const live = await getLiveStatus(now)
  const ids = findExpiredMeetingIds(
    await listMeetings(),
    autoDeleteDays,
    now,
    live?.meetingId ?? null
  )
  await deleteMeetings(ids)

  const cutoff = cutoffFor(autoDeleteDays, now)
  for (const log of await listDiagnostics()) {
    if (log.startedAt < cutoff && log.code !== live?.code) {
      await deleteDiagnostics(log.meetingId)
    }
  }
  return ids.length
}
