import { saveMeeting } from '@/shared/storage'
import { startContentController } from '@/features/recording/content-controller'
import { importLegacyMeetings } from '@/features/recording/legacy-import'
import { openFloatingWindow } from '@/features/floating-captions/open-floating-window'

startContentController({
  doc: document,
  win: window,
  now: () => Date.now(),
  createId: () => crypto.randomUUID(),
  tabToken: crypto.randomUUID(),
  openFloatingWindow,
})

void importLegacyMeetings(window.localStorage, saveMeeting).catch(
  (error: unknown) => {
    console.error('[meet-captions] falha ao importar reuniões antigas', error)
  }
)
