import { formatTime } from '@/lib/format'
import type { Session, Utterance } from '@/shared/types'
import type { ReactNode } from 'react'
import { UtteranceItem } from './utterance-item'

type TranscriptViewProps = {
  utterances: Utterance[]
  sessions: Session[]
}

function Marker({
  leftAt,
  returnedAt,
}: {
  leftAt: number
  returnedAt: number
}) {
  return (
    <li
      role="separator"
      className="text-muted-foreground py-1 text-center text-sm"
    >
      Saiu às {formatTime(leftAt)} · voltou às {formatTime(returnedAt)}
    </li>
  )
}

export function TranscriptView({ utterances, sessions }: TranscriptViewProps) {
  if (utterances.length === 0) {
    return <p className="text-muted-foreground">Nenhuma fala gravada ainda.</p>
  }

  const items: ReactNode[] = []
  let nextSession = 1
  for (const utterance of utterances) {
    while (
      nextSession < sessions.length &&
      utterance.startedAt >= sessions[nextSession].startedAt
    ) {
      items.push(
        <Marker
          key={`marker-${nextSession}`}
          leftAt={sessions[nextSession - 1].endedAt}
          returnedAt={sessions[nextSession].startedAt}
        />
      )
      nextSession++
    }
    items.push(<UtteranceItem key={utterance.id} utterance={utterance} />)
  }
  while (nextSession < sessions.length) {
    items.push(
      <Marker
        key={`marker-${nextSession}`}
        leftAt={sessions[nextSession - 1].endedAt}
        returnedAt={sessions[nextSession].startedAt}
      />
    )
    nextSession++
  }

  return <ol className="flex flex-col gap-2">{items}</ol>
}
