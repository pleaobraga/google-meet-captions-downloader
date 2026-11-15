import { normalizeText } from '@/lib/text'
import { getMeeting, listMeetings } from '@/shared/storage'
import type { Meeting } from '@/shared/types'

export { countMatches, splitHighlight, type TextPart } from '@/lib/text'

export function meetingMatches(meeting: Meeting, query: string): boolean {
  const needle = normalizeText(query.trim())
  if (!needle) return true
  const fields = [
    meeting.title,
    meeting.customTitle ?? '',
    meeting.code,
    ...meeting.utterances.flatMap((u) => [u.speaker, u.text]),
  ]
  return fields.some((field) => normalizeText(field).includes(needle))
}

export async function searchMeetingIds(query: string): Promise<Set<string>> {
  const ids = new Set<string>()
  for (const summary of await listMeetings()) {
    const meeting = await getMeeting(summary.id)
    if (meeting && meetingMatches(meeting, query)) ids.add(meeting.id)
  }
  return ids
}
