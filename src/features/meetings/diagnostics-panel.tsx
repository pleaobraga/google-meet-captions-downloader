import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatDateTime } from '@/lib/format'
import type { DiagnosticSummary } from '@/shared/types'

type DiagnosticsPanelProps = {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  logs: DiagnosticSummary[]
  onDownload: (meetingId: string) => void
  onDelete: (meetingId: string) => void
}

export function DiagnosticsPanel({
  enabled,
  onToggle,
  logs,
  onDownload,
  onDelete,
}: DiagnosticsPanelProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor="diagnostics-switch" className="text-sm font-medium">
            Modo de diagnóstico
          </label>
          <p className="text-muted-foreground text-xs">
            Grava as mudanças das legendas para análise.
          </p>
        </div>
        <Switch
          id="diagnostics-switch"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>
      {logs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <li
              key={log.meetingId}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-muted-foreground">
                {log.code || 'sem código'} · {formatDateTime(log.startedAt)} ·{' '}
                {log.eventCount} eventos{log.truncated ? ' · truncado' : ''}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => onDownload(log.meetingId)}
              >
                <Download />
                Baixar
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Apagar diagnóstico"
                onClick={() => onDelete(log.meetingId)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
