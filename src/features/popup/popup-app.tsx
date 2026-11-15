import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { disableExtension } from '@/features/extension-toggle/disable-extension'
import { ExtensionToggle } from '@/features/extension-toggle/extension-toggle'
import { useLiveStatus } from '@/features/extension-toggle/use-live-status'
import { useSettings } from '@/features/extension-toggle/use-settings'
import { LiveStatusLine } from './live-status-line'

const CLOCK_MS = 30_000

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}

export function PopupApp() {
  const { settings, update } = useSettings()
  const live = useLiveStatus()
  const now = useNow()

  return (
    <main className="bg-background text-foreground flex w-80 flex-col gap-4 p-4">
      <h1 className="text-base font-semibold">Meet Captions</h1>

      {settings && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Extensão</span>
          <ExtensionToggle
            enabled={settings.enabled}
            live={live}
            onEnable={() => update({ enabled: true })}
            onDisable={({ discard }) =>
              disableExtension({ discard, meetingId: live?.meetingId ?? null })
            }
          />
        </div>
      )}

      <LiveStatusLine live={live} now={now} />

      <Button
        onClick={() => {
          void chrome.tabs.create({
            url: chrome.runtime.getURL('meetings.html'),
          })
        }}
      >
        Abrir reuniões salvas
        <ArrowRight />
      </Button>
    </main>
  )
}
