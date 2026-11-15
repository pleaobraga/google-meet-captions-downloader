import { formatIsoDate } from '@/lib/format'
import { getMeeting, listMeetings, saveMeeting } from '@/shared/storage'
import type { Meeting } from '@/shared/types'

export type BackupFile = {
  app: 'meet-captions'
  version: 1
  exportedAt: number
  meetings: Meeting[]
}

export const BACKUP_ERROR = 'Arquivo de backup inválido'

export async function buildBackup(now: number): Promise<BackupFile> {
  const meetings: Meeting[] = []
  for (const summary of await listMeetings()) {
    const meeting = await getMeeting(summary.id)
    if (meeting) meetings.push(meeting)
  }
  return { app: 'meet-captions', version: 1, exportedAt: now, meetings }
}

export function backupFilename(now: number): string {
  return `meet-captions-backup-${formatIsoDate(now)}.json`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMeeting(value: unknown): value is Meeting {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.startedAt === 'number' &&
    Array.isArray(value.sessions) &&
    Array.isArray(value.utterances)
  )
}

export function parseBackup(json: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error(BACKUP_ERROR)
  }
  if (
    !isRecord(data) ||
    data.app !== 'meet-captions' ||
    data.version !== 1 ||
    !Array.isArray(data.meetings) ||
    !data.meetings.every(isMeeting)
  ) {
    throw new Error(BACKUP_ERROR)
  }
  return {
    app: 'meet-captions',
    version: 1,
    exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : 0,
    meetings: data.meetings,
  }
}

/** Traz as reuniões do backup. As que já existem não são alteradas. */
export async function importBackup(
  file: BackupFile
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0
  for (const meeting of file.meetings) {
    if (await getMeeting(meeting.id)) {
      skipped++
      continue
    }
    await saveMeeting(meeting)
    imported++
  }
  return { imported, skipped }
}
