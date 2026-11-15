import { Settings as SettingsIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  backupFilename,
  buildBackup,
  importBackup,
  parseBackup,
} from '@/features/backup/backup'
import { useLiveStatus } from '@/features/extension-toggle/use-live-status'
import { useSettings } from '@/features/extension-toggle/use-settings'
import { pluralMeetings } from '@/features/meetings/bulk-delete'
import { DiagnosticsPanel } from '@/features/meetings/diagnostics-panel'
import { useDiagnostics } from '@/features/meetings/use-diagnostics'
import { useMeetings } from '@/features/meetings/use-meetings'
import {
  AUTO_DELETE_OPTIONS,
  findExpiredMeetingIds,
  runRetention,
} from '@/features/retention/retention'
import { downloadTextFile } from '@/lib/download'
import { deleteDiagnostics, getDiagnostics } from '@/shared/storage'
import type { AutoDeleteDays } from '@/shared/types'

const OPTION_LABELS: Record<AutoDeleteDays, string> = {
  0: 'Nunca',
  30: 'Com mais de 30 dias',
  90: 'Com mais de 90 dias',
  180: 'Com mais de 180 dias',
}

function retentionMessage(n: number, days: AutoDeleteDays): string {
  if (n === 0) {
    return `Nenhuma reunião será apagada agora. As que passarem de ${days} dias serão apagadas automaticamente.`
  }
  const verb = n === 1 ? 'será apagada' : 'serão apagadas'
  return `${pluralMeetings(n)} com mais de ${days} dias ${verb} agora. Daqui em diante, a limpeza é automática.`
}

function importMessage(imported: number, skipped: number): string {
  const verb = imported === 1 ? 'importada' : 'importadas'
  return `${pluralMeetings(imported)} ${verb}, ${skipped} já existiam.`
}

async function downloadDiagnostics(meetingId: string) {
  const log = await getDiagnostics(meetingId)
  if (!log) return
  downloadTextFile(
    `diagnostico-${log.code}-${log.startedAt}.json`,
    JSON.stringify(log, null, 2),
    'application/json'
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

export function SettingsDialog() {
  const { settings, update } = useSettings()
  const meetings = useMeetings()
  const live = useLiveStatus()
  const logs = useDiagnostics()
  const [pendingDays, setPendingDays] = useState<AutoDeleteDays | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  const chooseDays = (value: string) => {
    const days = Number(value) as AutoDeleteDays
    if (days === 0) {
      void update({ autoDeleteDays: 0 })
      return
    }
    setPendingCount(
      findExpiredMeetingIds(
        meetings ?? [],
        days,
        Date.now(),
        live?.meetingId ?? null
      ).length
    )
    setPendingDays(days)
  }

  const confirmDays = async () => {
    if (pendingDays === null) return
    const days = pendingDays
    setPendingDays(null)
    await update({ autoDeleteDays: days })
    await runRetention(Date.now())
  }

  const exportAll = async () => {
    const now = Date.now()
    downloadTextFile(
      backupFilename(now),
      JSON.stringify(await buildBackup(now)),
      'application/json'
    )
  }

  const importFile = async (file: File) => {
    try {
      const { imported, skipped } = await importBackup(
        parseBackup(await file.text())
      )
      toast.success(importMessage(imported, skipped))
    } catch {
      toast.error('Arquivo de backup inválido')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Configurações">
          <SettingsIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>

        {settings && (
          <div className="flex flex-col gap-6">
            <Section title="Meu nome">
              <div className="flex flex-col gap-1">
                <Label htmlFor="my-name">Meu nome</Label>
                <Input
                  id="my-name"
                  defaultValue={settings.myName}
                  onBlur={(event) =>
                    void update({ myName: event.target.value.trim() })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Aparece no lugar de "Você" nas transcrições. Deixe vazio para
                  manter como o Meet mostra.
                </p>
              </div>
            </Section>

            <Section title="Apagar reuniões antigas automaticamente">
              <RadioGroup
                value={String(settings.autoDeleteDays)}
                onValueChange={chooseDays}
              >
                {AUTO_DELETE_OPTIONS.map((days) => (
                  <div key={days} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={String(days)}
                      id={`retention-${days}`}
                    />
                    <Label htmlFor={`retention-${days}`}>
                      {OPTION_LABELS[days]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </Section>

            <Section title="Backup">
              <p className="text-muted-foreground text-sm">
                As reuniões ficam guardadas só nesta extensão. Se você remover a
                extensão do Chrome, elas são apagadas.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void exportAll()}>
                  Exportar tudo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInput.current?.click()}
                >
                  Importar backup
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  aria-label="Arquivo de backup"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void importFile(file)
                  }}
                />
              </div>
            </Section>

            <Section title="Modo de diagnóstico">
              <DiagnosticsPanel
                enabled={settings.diagnostics}
                onToggle={(diagnostics) => void update({ diagnostics })}
                logs={logs}
                onDownload={(id) => void downloadDiagnostics(id)}
                onDelete={(id) => void deleteDiagnostics(id)}
              />
            </Section>
          </div>
        )}

        <AlertDialog
          open={pendingDays !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDays(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar reuniões antigas?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDays !== null &&
                  retentionMessage(pendingCount, pendingDays)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmDays()}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
