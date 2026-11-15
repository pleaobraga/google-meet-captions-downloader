import type { Meeting } from '@/shared/types'

export const LEGACY_PREFIX = 'captionText_'
export const LEGACY_HISTORY_PREFIX = 'history_captionText_'

function parseLegacy(
  raw: string | null
): { text: string; title?: string } | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { text, title } = value as { text?: unknown; title?: unknown }
    if (typeof text !== 'string') return null
    return { text, title: typeof title === 'string' ? title : undefined }
  } catch {
    return null
  }
}

/** Lê as reuniões gravadas pela versão antiga no localStorage do Meet. */
export function readLegacyMeetings(ls: Storage): {
  meetings: Meeting[]
  keys: string[]
} {
  const allKeys: string[] = []
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i)
    if (key !== null) allKeys.push(key)
  }

  const meetings: Meeting[] = []
  const keys: string[] = []

  for (const key of allKeys) {
    if (key.startsWith(LEGACY_HISTORY_PREFIX)) {
      keys.push(key)
      continue
    }
    if (!key.startsWith(LEGACY_PREFIX)) continue

    const value = parseLegacy(ls.getItem(key))
    if (value === null) continue
    keys.push(key)

    const text = value.text.trim()
    const ts = Number(key.slice(LEGACY_PREFIX.length))
    if (!text || !Number.isFinite(ts)) continue

    meetings.push({
      id: `legacy_${ts}`,
      code: '',
      title: value.title || 'Reunião antiga',
      startedAt: ts,
      sessions: [{ startedAt: ts, endedAt: ts }],
      utterances: [
        {
          id: `legacy_${ts}_1`,
          speaker: '',
          startedAt: ts,
          text: value.text,
          final: true,
        },
      ],
      legacy: true,
    })
  }

  return { meetings, keys }
}

/** Salva as reuniões antigas na extensão e só depois limpa o localStorage. */
export async function importLegacyMeetings(
  ls: Storage,
  save: (meeting: Meeting) => Promise<void>
): Promise<number> {
  const { meetings, keys } = readLegacyMeetings(ls)
  for (const meeting of meetings) await save(meeting)
  for (const key of keys) ls.removeItem(key)
  return meetings.length
}
