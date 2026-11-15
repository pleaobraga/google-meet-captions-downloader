import { formatTime } from '@/lib/format'
import { displaySpeaker } from '@/lib/speaker'
import { splitHighlight } from '@/lib/text'
import { cn } from '@/lib/utils'
import type { Utterance } from '@/shared/types'

type UtteranceItemProps = {
  utterance: Utterance
  myName?: string
  highlight?: string
}

export function UtteranceItem({
  utterance: u,
  myName,
  highlight,
}: UtteranceItemProps) {
  const speaker = displaySpeaker(u.speaker, myName ?? '')
  return (
    <li className="flex gap-2 leading-relaxed">
      <time className="text-muted-foreground shrink-0 tabular-nums">
        {formatTime(u.startedAt)}
      </time>
      <p>
        {speaker && <strong className="font-semibold">{speaker}:</strong>}{' '}
        <span
          className={cn(
            'whitespace-pre-wrap',
            !u.final && 'text-muted-foreground'
          )}
        >
          {splitHighlight(u.text, highlight ?? '').map((part, i) =>
            part.match ? (
              <mark
                key={i}
                className="bg-yellow-500/40 text-foreground rounded-sm"
              >
                {part.text}
              </mark>
            ) : (
              part.text
            )
          )}
        </span>
      </p>
    </li>
  )
}
