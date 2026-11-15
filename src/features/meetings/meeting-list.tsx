import { Badge } from '@/components/ui/badge'
import { displayTitle, formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MeetingSummary } from '@/shared/types'

type MeetingListProps = {
  meetings: MeetingSummary[]
  selectedId: string | null
  liveMeetingId: string | null
  onSelect: (id: string) => void
}

export function MeetingList({
  meetings,
  selectedId,
  liveMeetingId,
  onSelect,
}: MeetingListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {meetings.map((m) => {
        const selected = m.id === selectedId
        return (
          <li key={m.id}>
            <button
              type="button"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(m.id)}
              className={cn(
                'hover:bg-accent/60 flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left',
                selected && 'bg-accent'
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className="truncate font-medium">{displayTitle(m)}</span>
                {m.id === liveMeetingId && <Badge>Ao vivo</Badge>}
                {m.legacy && <Badge variant="secondary">Formato antigo</Badge>}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(m.startedAt)} · {formatDuration(m.durationMs)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
