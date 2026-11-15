import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Utterance } from '@/shared/types'

type UtteranceItemProps = {
  utterance: Utterance
}

export function UtteranceItem({ utterance: u }: UtteranceItemProps) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <time className="text-muted-foreground shrink-0 tabular-nums">
        {formatTime(u.startedAt)}
      </time>
      <p>
        {u.speaker && <strong className="font-semibold">{u.speaker}:</strong>}{' '}
        <span
          className={cn(
            'whitespace-pre-wrap',
            !u.final && 'text-muted-foreground'
          )}
        >
          {u.text}
        </span>
      </p>
    </li>
  )
}
