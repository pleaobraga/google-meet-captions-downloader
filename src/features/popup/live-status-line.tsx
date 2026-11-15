import { displayTitle, formatTime } from '@/lib/format'
import type { LiveStatus } from '@/shared/types'

type LiveStatusLineProps = {
  live: LiveStatus | undefined
  now: number
}

export function LiveStatusLine({ live, now }: LiveStatusLineProps) {
  if (!live) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma reunião em andamento
      </p>
    )
  }
  if (live.state === 'stopped') {
    return <p className="text-sm">Gravação parada nesta reunião</p>
  }
  if (live.state === 'captions-unavailable') {
    return (
      <p className="text-destructive text-sm">
        Não foi possível ler as legendas desta reunião
      </p>
    )
  }
  if (live.state === 'captions-off') {
    return <p className="text-sm">Legendas desligadas · gravação pausada</p>
  }
  if (live.meetingId === null) {
    return (
      <p className="text-sm">Na reunião {live.code} · aguardando legendas</p>
    )
  }
  const minutes = Math.floor((now - live.since) / 60_000)
  return (
    <div className="text-sm">
      <p className="font-medium">Gravando: {displayTitle(live)}</p>
      <p className="text-muted-foreground">
        desde {formatTime(live.since)} · {minutes} min
      </p>
    </div>
  )
}
