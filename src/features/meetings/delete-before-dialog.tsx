import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MeetingSummary } from '@/shared/types'
import { idsBefore, pluralMeetings } from './bulk-delete'

type DeleteBeforeDialogProps = {
  meetings: MeetingSummary[]
  liveMeetingId: string | null
  onDelete: (ids: string[]) => void | Promise<void>
}

function summaryText(n: number): string {
  if (n === 0) return 'Nenhuma reunião anterior a essa data.'
  if (n === 1) return '1 reunião será apagada para sempre.'
  return `${pluralMeetings(n)} serão apagadas para sempre.`
}

export function DeleteBeforeDialog({
  meetings,
  liveMeetingId,
  onDelete,
}: DeleteBeforeDialogProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const ids = idsBefore(meetings, date, liveMeetingId)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setDate('')
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Apagar antigas…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apagar reuniões antigas</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-before-date">
            Apagar reuniões anteriores a
          </Label>
          <Input
            id="delete-before-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          {date && <p className="text-sm">{summaryText(ids.length)}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={ids.length === 0}
            onClick={() => {
              setOpen(false)
              setDate('')
              void onDelete(ids)
            }}
          >
            Apagar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
