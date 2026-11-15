import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { displayTitle, formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MeetingSummary } from '@/shared/types'

type MeetingListProps = {
  meetings: MeetingSummary[]
  selectedId: string | null
  liveMeetingId: string | null
  selection: Set<string>
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
}

export function MeetingList({
  meetings,
  selectedId,
  liveMeetingId,
  selection,
  onSelect,
  onToggleSelect,
}: MeetingListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {meetings.map((m) => {
        const selected = m.id === selectedId
        const title = displayTitle(m)
        return (
          <li key={m.id} className="flex items-center gap-2">
            <Checkbox
              aria-label={`Selecionar ${title}`}
              checked={selection.has(m.id)}
              disabled={m.id === liveMeetingId}
              onCheckedChange={() => onToggleSelect(m.id)}
              className="ml-2"
            />
            <button
              type="button"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(m.id)}
              className={cn(
                'hover:bg-accent/60 flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md px-3 py-2 text-left',
                selected && 'bg-accent'
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className="truncate font-medium">{title}</span>
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
