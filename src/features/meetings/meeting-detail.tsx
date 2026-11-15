import { Download, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { TranscriptView } from '@/components/transcript/transcript-view'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  displayTitle,
  formatDate,
  formatDuration,
  formatTime,
} from '@/lib/format'
import { participantsOf } from '@/lib/speaker'
import { countMatches } from '@/lib/text'
import { summarizeMeeting } from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import type { ExportFormat } from './export'

type MeetingDetailProps = {
  meeting: Meeting
  isLive: boolean
  myName: string
  initialQuery?: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void | Promise<void>
  onDownload: (format: ExportFormat) => void
}

function occurrencesLabel(n: number): string {
  if (n === 0) return 'Nenhuma ocorrência'
  return n === 1 ? '1 ocorrência' : `${n} ocorrências`
}

export function MeetingDetail({
  meeting,
  isLive,
  myName,
  initialQuery,
  onRename,
  onDelete,
  onDownload,
}: MeetingDetailProps) {
  const title = displayTitle(meeting)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [query, setQuery] = useState(initialQuery ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const end = meeting.sessions.at(-1)?.endedAt ?? meeting.startedAt
  const participants = participantsOf(meeting.utterances, myName)
  const occurrences = meeting.utterances.reduce(
    (total, u) => total + countMatches(u.text, query),
    0
  )

  const startEditing = () => {
    setDraft(title)
    setEditing(true)
  }
  const save = () => {
    setEditing(false)
    void onRename(draft)
  }

  return (
    <article className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {editing ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                save()
              }}
            >
              <Input
                aria-label="Título da reunião"
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setEditing(false)
                }}
              />
              <Button type="submit" size="sm">
                Salvar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-1">
              <h2 className="truncate text-xl font-semibold">{title}</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Renomear reunião"
                onClick={startEditing}
              >
                <Pencil />
              </Button>
            </div>
          )}
          <p className="text-muted-foreground text-sm">
            {formatDate(meeting.startedAt)} · {formatTime(meeting.startedAt)}–
            {formatTime(end)} ·{' '}
            {formatDuration(summarizeMeeting(meeting).durationMs)}
          </p>
          {participants.length > 0 && (
            <p className="text-muted-foreground text-sm">
              Participantes: {participants.join(', ')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download />
                Baixar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onDownload('md')}>
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDownload('txt')}>
                Texto (.txt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Apagar reunião"
            disabled={isLive}
            title={
              isLive ? 'A reunião em gravação não pode ser apagada' : undefined
            }
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <Input
          aria-label="Buscar nesta reunião"
          placeholder="Buscar nesta reunião"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm"
        />
        {query.trim() && (
          <span className="text-muted-foreground text-sm">
            {occurrencesLabel(occurrences)}
          </span>
        )}
      </div>

      <TranscriptView
        utterances={meeting.utterances}
        sessions={meeting.sessions}
        myName={myName}
        highlight={query}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              "{title}" será apagada para sempre. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void onDelete()}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
