import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLiveStatus } from '@/features/extension-toggle/use-live-status'
import { useSettings } from '@/features/extension-toggle/use-settings'
import { downloadTextFile } from '@/lib/download'
import { getDiagnostics } from '@/shared/storage'
import { useState } from 'react'
import { DiagnosticsPanel } from './diagnostics-panel'
import { LiveBanner } from './live-banner'
import { MeetingDetail } from './meeting-detail'
import { MeetingList } from './meeting-list'
import { useDiagnostics } from './use-diagnostics'
import { useMeeting } from './use-meeting'
import { useMeetings } from './use-meetings'

async function downloadDiagnostics(meetingId: string) {
  const log = await getDiagnostics(meetingId)
  if (!log) return
  downloadTextFile(
    `diagnostico-${log.code}-${log.startedAt}.json`,
    JSON.stringify(log, null, 2),
    'application/json'
  )
}

export function MeetingsApp() {
  const meetings = useMeetings()
  const live = useLiveStatus()
  const { settings, update } = useSettings()
  const logs = useDiagnostics()
  const [chosenId, setChosenId] = useState<string | null>(null)

  const selectedId =
    chosenId && meetings?.some((m) => m.id === chosenId)
      ? chosenId
      : (meetings?.[0]?.id ?? null)
  const meeting = useMeeting(selectedId)

  return (
    <div className="bg-background text-foreground flex h-screen">
      <aside className="flex w-80 flex-col border-r">
        <h1 className="px-4 py-3 text-lg font-semibold">Reuniões</h1>
        <ScrollArea className="min-h-0 flex-1 px-2">
          {meetings && (
            <MeetingList
              meetings={meetings}
              selectedId={selectedId}
              liveMeetingId={live?.meetingId ?? null}
              onSelect={setChosenId}
            />
          )}
        </ScrollArea>
        <Separator />
        <div className="p-4">
          {settings && (
            <DiagnosticsPanel
              enabled={settings.diagnostics}
              onToggle={(diagnostics) => void update({ diagnostics })}
              logs={logs}
              onDownload={(id) => void downloadDiagnostics(id)}
            />
          )}
        </div>
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
              meeting={meeting}
              isLive={meeting.id === live?.meetingId}
              myName=""
              onRename={() => {}}
              onDelete={() => {}}
              onDownload={() => {}}
            />
          </ScrollArea>
        )}
      </main>
    </div>
  )
}
