import { ArrowDown } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { TranscriptView } from '@/components/transcript/transcript-view'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CaptionsStore, FloatingStatus } from './captions-store'
import { useStickToBottom } from './use-stick-to-bottom'

export const FONT_MIN = 12
export const FONT_MAX = 32
export const FONT_STEP = 2

const MESSAGES: Record<FloatingStatus, string> = {
  idle: 'Nenhuma reunião em andamento',
  recording: 'Aguardando legendas…',
  'captions-off': 'Legendas desligadas',
  stopped: 'Gravação parada nesta reunião',
  'captions-unavailable': 'Não foi possível ler as legendas',
}

type FloatingCaptionsProps = {
  store: CaptionsStore
  myName: string
  fontSize: number
  onFontSizeChange: (size: number) => void
}

export function FloatingCaptions({
  store,
  myName,
  fontSize,
  onFontSizeChange,
}: FloatingCaptionsProps) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const { ref, stuck, onScroll, scrollToBottom } = useStickToBottom(snapshot)
  const hasUtterances = snapshot.utterances.length > 0
  const message = MESSAGES[snapshot.status]

  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Legendas</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            aria-label="Diminuir letra"
            disabled={fontSize <= FONT_MIN}
            onClick={() => onFontSizeChange(fontSize - FONT_STEP)}
          >
            A−
          </Button>
          <Button
            variant="ghost"
            size="xs"
            aria-label="Aumentar letra"
            disabled={fontSize >= FONT_MAX}
            onClick={() => onFontSizeChange(fontSize + FONT_STEP)}
          >
            A+
          </Button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={ref}
          onScroll={onScroll}
          className="h-full overflow-y-auto px-3 py-2"
          style={{ fontSize }}
        >
          {hasUtterances ? (
            <TranscriptView
              utterances={snapshot.utterances}
              sessions={snapshot.sessions}
              myName={myName}
            />
          ) : (
            <p className="text-muted-foreground flex h-full items-center justify-center text-center">
              {message}
            </p>
          )}
        </div>
        {!stuck && (
          <Button
            size="sm"
            className="absolute right-3 bottom-3"
            onClick={scrollToBottom}
          >
            <ArrowDown />
            Voltar ao vivo
          </Button>
        )}
      </div>

      {hasUtterances && snapshot.status !== 'recording' && (
        <p
          className={cn(
            'border-t px-3 py-1 text-sm',
            snapshot.status === 'captions-unavailable' && 'text-destructive'
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
