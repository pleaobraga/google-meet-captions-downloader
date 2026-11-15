import { formatTime } from '@/lib/format'
import type { Session, Utterance } from '@/shared/types'
import { buildTranscriptItems } from './transcript-items'
import { UtteranceItem } from './utterance-item'

type TranscriptViewProps = {
  utterances: Utterance[]
  sessions: Session[]
  myName?: string
  highlight?: string
}

export function TranscriptView({
  utterances,
  sessions,
  myName,
  highlight,
}: TranscriptViewProps) {
  if (utterances.length === 0) {
    return <p className="text-muted-foreground">Nenhuma fala gravada ainda.</p>
  }

  return (
    <ol className="flex flex-col gap-2">
      {buildTranscriptItems(utterances, sessions).map((item) =>
        item.kind === 'utterance' ? (
          <UtteranceItem
            key={item.utterance.id}
            utterance={item.utterance}
            myName={myName}
            highlight={highlight}
          />
        ) : (
          <li
            key={`marker-${item.returnedAt}`}
            role="separator"
            className="text-muted-foreground py-1 text-center text-sm"
          >
            Saiu às {formatTime(item.leftAt)} · voltou às{' '}
            {formatTime(item.returnedAt)}
          </li>
        )
      )}
    </ol>
  )
}
