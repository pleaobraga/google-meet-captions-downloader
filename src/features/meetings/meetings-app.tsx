import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import { useLiveStatus } from '@/features/extension-toggle/use-live-status'
import { SettingsDialog } from '@/features/settings/settings-dialog'
import { useSettings } from '@/features/extension-toggle/use-settings'
import { downloadTextFile } from '@/lib/download'
import { deleteMeetings, renameMeeting } from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import { pluralMeetings } from './bulk-delete'
import { DeleteBeforeDialog } from './delete-before-dialog'
import { buildExport, exportFilename, type ExportFormat } from './export'
import { LiveBanner } from './live-banner'
import { MeetingDetail } from './meeting-detail'
import { MeetingList } from './meeting-list'
import { searchMeetingIds } from './search'
import { useMeeting } from './use-meeting'
import { useMeetings } from './use-meetings'

const SEARCH_DEBOUNCE_MS = 200

function downloadMeeting(
  meeting: Meeting,
  format: ExportFormat,
  myName: string
) {
  downloadTextFile(
    exportFilename(meeting, format),
    buildExport(meeting, format, myName),
    format === 'md' ? 'text/markdown' : 'text/plain'
  )
}

/** Ids que casam com a busca, recalculados 200 ms depois da última tecla. */
function useSearchResults(query: string, version: unknown): Set<string> | null {
  const [results, setResults] = useState<Set<string> | null>(null)

  useEffect(() => {
    const term = query.trim()
    let active = true
    const timer = setTimeout(
      () => {
        if (!term) {
          setResults(null)
          return
        }
        void searchMeetingIds(term).then((ids) => {
          if (active) setResults(ids)
        })
      },
      term ? SEARCH_DEBOUNCE_MS : 0
    )
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, version])

  return query.trim() ? results : null
}

export function MeetingsApp() {
  const meetings = useMeetings()
  const live = useLiveStatus()
  const { settings } = useSettings()
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)
  const results = useSearchResults(query, meetings)

  const myName = settings?.myName ?? ''
  const liveMeetingId = live?.meetingId ?? null
  const visible = (meetings ?? []).filter((m) => !results || results.has(m.id))
  const selectedId =
    chosenId && visible.some((m) => m.id === chosenId)
      ? chosenId
      : (visible[0]?.id ?? null)
  const meeting = useMeeting(selectedId)
  const selectedCount = [...selection].filter((id) =>
    meetings?.some((m) => m.id === id)
  ).length

  const toggleSelect = (id: string) => {
    setSelection((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deleteSelected = async () => {
    const ids = [...selection]
    setSelection(new Set())
    await deleteMeetings(ids)
  }

  return (
    <div className="bg-background text-foreground flex h-screen">
      <aside className="flex w-80 flex-col border-r">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h1 className="text-lg font-semibold">Reuniões</h1>
          <SettingsDialog />
        </div>
        <div className="px-4 pb-2">
          <Input
            aria-label="Buscar em todas as reuniões"
            placeholder="Buscar em todas as reuniões"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBulk(true)}
            >
              Apagar selecionadas ({selectedCount})
            </Button>
          )}
          <DeleteBeforeDialog
            meetings={meetings ?? []}
            liveMeetingId={liveMeetingId}
            onDelete={(ids) => deleteMeetings(ids)}
          />
        </div>
        <ScrollArea className="min-h-0 flex-1 px-2">
          {meetings && results && visible.length === 0 && (
            <p className="text-muted-foreground px-2 text-sm">
              Nenhuma reunião encontrada.
            </p>
          )}
          {meetings && (
            <MeetingList
              meetings={visible}
              selectedId={selectedId}
              liveMeetingId={liveMeetingId}
              selection={selection}
              onSelect={setChosenId}
              onToggleSelect={toggleSelect}
            />
          )}
        </ScrollArea>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <LiveBanner live={live} />
        {meetings && meetings.length === 0 && (
          <p className="text-muted-foreground">
            Nenhuma reunião gravada ainda.
          </p>
        )}
        {meeting && (
          <ScrollArea className="min-h-0 flex-1">
            <MeetingDetail
              key={meeting.id}
              meeting={meeting}
              isLive={meeting.id === liveMeetingId}
              myName={myName}
              initialQuery={query}
              onRename={(title) => renameMeeting(meeting.id, title)}
              onDelete={() => deleteMeetings([meeting.id])}
              onDownload={(format) => downloadMeeting(meeting, format, myName)}
            />
          </ScrollArea>
        )}
      </main>

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Apagar {pluralMeetings(selectedCount)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Elas serão apagadas para sempre. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void deleteSelected()}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  )
}
