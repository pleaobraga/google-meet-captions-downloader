import { useState } from 'react'
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
import { displayTitle } from '@/lib/format'
import type { LiveStatus } from '@/shared/types'

type StopRecordingButtonProps = {
  live: LiveStatus | undefined
  onStop: (options: { discard: boolean }) => void | Promise<void>
  onResume: () => void | Promise<void>
}

export function StopRecordingButton({
  live,
  onStop,
  onResume,
}: StopRecordingButtonProps) {
  const [open, setOpen] = useState(false)
  if (!live) return null

  if (live.state === 'stopped') {
    return (
      <Button variant="outline" onClick={() => void onResume()}>
        Retomar gravação
      </Button>
    )
  }

  const recorded = live.meetingId !== null
  const stop = (discard: boolean) => {
    setOpen(false)
    void onStop({ discard })
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Parar de gravar esta reunião
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          {recorded ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  O que fazer com o que já foi gravado?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  "{displayTitle(live)}" já tem {live.utteranceCount} falas
                  gravadas. A extensão continua ligada para as outras reuniões.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => stop(true)}
                >
                  Descartar
                </AlertDialogAction>
                <AlertDialogAction onClick={() => stop(false)}>
                  Manter gravação
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Parar de gravar esta reunião?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  A extensão continua ligada para as outras reuniões.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => stop(false)}>
                  Parar
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
