import type { MeetingSummary } from '@/shared/types'

export function pluralMeetings(n: number): string {
  return n === 1 ? '1 reunião' : `${n} reuniões`
}

/** Ids das reuniões que começaram antes da meia-noite local de `dateIso`. */
export function idsBefore(
  summaries: MeetingSummary[],
  dateIso: string,
  liveMeetingId: string | null
): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso)
  if (!match) return []
  const [, year, month, day] = match.map(Number)
  const cutoff = new Date(year, month - 1, day).getTime()
  if (!Number.isFinite(cutoff)) return []
  return summaries
    .filter((s) => s.startedAt < cutoff && s.id !== liveMeetingId)
    .map((s) => s.id)
}
