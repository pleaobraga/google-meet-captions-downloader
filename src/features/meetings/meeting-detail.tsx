import { TranscriptView } from '@/components/transcript/transcript-view'
import { displayTitle, formatDateTime } from '@/lib/format'
import type { Meeting } from '@/shared/types'

type MeetingDetailProps = {
  meeting: Meeting
}

function participantsOf(meeting: Meeting): string[] {
  const names: string[] = []
  for (const { speaker } of meeting.utterances) {
    const name = speaker.trim()
    if (name && !names.includes(name)) names.push(name)
  }
  return names
}

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  const participants = participantsOf(meeting)
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{displayTitle(meeting)}</h2>
        <p className="text-muted-foreground text-sm">
          {formatDateTime(meeting.startedAt)}
        </p>
        {participants.length > 0 && (
          <p className="text-muted-foreground text-sm">
            Participantes: {participants.join(', ')}
          </p>
        )}
      </header>
      <TranscriptView
        utterances={meeting.utterances}
        sessions={meeting.sessions}
      />
    </article>
  )
}
