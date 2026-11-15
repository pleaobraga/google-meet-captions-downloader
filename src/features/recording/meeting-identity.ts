import { sameLocalDay } from '@/shared/time'
import type { MeetingSummary } from '@/shared/types'

const MEETING_CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/

export const CONTINUE_GAP_MS = 15 * 60 * 1000

export function parseMeetingCode(url: string): string | null {
  try {
    const segment = new URL(url).pathname.split('/')[1] ?? ''
    return MEETING_CODE.test(segment) ? segment : null
  } catch {
    return null
  }
}

export function shouldContinueMeeting(
  previous: MeetingSummary | undefined,
  now: number
): boolean {
  if (!previous) return false
  return (
    sameLocalDay(previous.startedAt, now) ||
    now - previous.endedAt <= CONTINUE_GAP_MS
  )
}
