import {
  DEFAULT_SETTINGS,
  type DiagnosticLog,
  type DiagnosticSummary,
  type LiveStatus,
  type Meeting,
  type MeetingSummary,
  type Settings,
} from './types'

export const STORAGE_KEYS = {
  settings: 'settings',
  index: 'meetingIndex',
  live: 'live',
  meeting: (id: string) => `meeting:${id}`,
  diagnostics: (id: string) => `diagnostics:${id}`,
}

const DIAGNOSTICS_PREFIX = 'diagnostics:'

export const LIVE_STALE_MS = 45_000

async function read<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key] as T | undefined
}

export function summarizeMeeting(meeting: Meeting): MeetingSummary {
  return {
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    customTitle: meeting.customTitle,
    startedAt: meeting.startedAt,
    endedAt: meeting.sessions.at(-1)?.endedAt ?? meeting.startedAt,
    // Soma do tempo de cada sessão (R5.2): o intervalo entre sair e voltar não conta.
    durationMs: meeting.sessions.reduce(
      (total, session) => total + (session.endedAt - session.startedAt),
      0
    ),
    utteranceCount: meeting.utterances.length,
    legacy: meeting.legacy,
  }
}

export async function getSettings(): Promise<Settings> {
  const stored = await read<Partial<Settings>>(STORAGE_KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next })
  return next
}

export function onStorageKeysChange(
  keys: string[],
  callback: () => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local') return
    if (Object.keys(changes).some((key) => keys.includes(key))) callback()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export function onSettingsChange(
  callback: (settings: Settings) => void
): () => void {
  return onStorageKeysChange([STORAGE_KEYS.settings], () => {
    void getSettings().then(callback)
  })
}

async function readIndex(): Promise<MeetingSummary[]> {
  return (await read<MeetingSummary[]>(STORAGE_KEYS.index)) ?? []
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  const index = await readIndex()
  const next = [
    summarizeMeeting(meeting),
    ...index.filter((summary) => summary.id !== meeting.id),
  ].sort((a, b) => b.startedAt - a.startedAt)
  await chrome.storage.local.set({
    [STORAGE_KEYS.meeting(meeting.id)]: meeting,
    [STORAGE_KEYS.index]: next,
  })
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  return read<Meeting>(STORAGE_KEYS.meeting(id))
}

export async function listMeetings(): Promise<MeetingSummary[]> {
  return (await readIndex()).sort((a, b) => b.startedAt - a.startedAt)
}

export async function findLatestMeetingByCode(
  code: string
): Promise<MeetingSummary | undefined> {
  return (await listMeetings()).find((summary) => summary.code === code)
}

export async function deleteMeeting(id: string): Promise<void> {
  const index = await readIndex()
  await chrome.storage.local.set({
    [STORAGE_KEYS.index]: index.filter((summary) => summary.id !== id),
  })
  await chrome.storage.local.remove([
    STORAGE_KEYS.meeting(id),
    STORAGE_KEYS.diagnostics(id),
  ])
}

export async function getLiveStatus(
  now: number = Date.now()
): Promise<LiveStatus | undefined> {
  const status = await read<LiveStatus>(STORAGE_KEYS.live)
  if (!status) return undefined
  if (now - status.heartbeatAt > LIVE_STALE_MS) return undefined
  return status
}

export async function setLiveStatus(status: LiveStatus): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.live]: status })
}

export async function clearLiveStatus(tabToken?: string): Promise<void> {
  if (tabToken !== undefined) {
    const status = await read<LiveStatus>(STORAGE_KEYS.live)
    if (!status || status.tabToken !== tabToken) return
  }
  await chrome.storage.local.remove(STORAGE_KEYS.live)
}

export async function saveDiagnostics(log: DiagnosticLog): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.diagnostics(log.meetingId)]: log,
  })
}

export async function getDiagnostics(
  meetingId: string
): Promise<DiagnosticLog | undefined> {
  return read<DiagnosticLog>(STORAGE_KEYS.diagnostics(meetingId))
}

export async function listDiagnostics(): Promise<DiagnosticSummary[]> {
  const all = await chrome.storage.local.get(null)
  return Object.entries(all)
    .filter(([key]) => key.startsWith(DIAGNOSTICS_PREFIX))
    .map(([, value]) => {
      const log = value as DiagnosticLog
      return {
        meetingId: log.meetingId,
        code: log.code,
        startedAt: log.startedAt,
        eventCount: log.events.length,
        truncated: log.truncated,
      }
    })
    .sort((a, b) => b.startedAt - a.startedAt)
}
