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
import { Switch } from '@/components/ui/switch'
import { displayTitle } from '@/lib/format'
import type { LiveStatus } from '@/shared/types'

type ExtensionToggleProps = {
  enabled: boolean
  live: LiveStatus | undefined
  onEnable: () => void | Promise<void>
  onDisable: (options: { discard: boolean }) => void | Promise<void>
}

type Step = 'closed' | 'confirm' | 'confirm-live' | 'keep-or-discard'

export function ExtensionToggle({
  enabled,
  live,
  onEnable,
  onDisable,
}: ExtensionToggleProps) {
  const [step, setStep] = useState<Step>('closed')
  const recording = live !== undefined && live.meetingId !== null

  const close = () => setStep('closed')
  const disable = (discard: boolean) => {
    close()
    void onDisable({ discard })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {enabled ? 'Ligada' : 'Desligada'}
        </span>
        <Switch
          aria-label="Ligar ou desligar a extensão"
          checked={enabled}
          onCheckedChange={(checked) => {
            if (checked) void onEnable()
            else setStep(recording ? 'confirm-live' : 'confirm')
          }}
        />
      </div>

      <AlertDialog
        open={step !== 'closed'}
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <AlertDialogContent>
          {step === 'confirm' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Desligar a extensão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ela deixará de ligar as legendas e de gravar as reuniões.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => disable(false)}>
                  Desligar
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {step === 'confirm-live' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Há uma reunião sendo gravada
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja desligar a extensão mesmo assim?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                {/* Button comum: o AlertDialogAction fecharia o diálogo. */}
                <Button onClick={() => setStep('keep-or-discard')}>
                  Desligar
                </Button>
              </AlertDialogFooter>
            </>
          )}

          {step === 'keep-or-discard' && live && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>O que fazer com a gravação?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{displayTitle(live)}" já tem {live.utteranceCount} falas
                  gravadas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => disable(true)}
                >
                  Descartar
                </AlertDialogAction>
                <AlertDialogAction onClick={() => disable(false)}>
                  Manter gravação
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
