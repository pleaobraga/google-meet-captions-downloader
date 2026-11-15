import { useSettings } from '@/features/extension-toggle/use-settings'
import type { CaptionsStore } from './captions-store'
import { FONT_MAX, FONT_MIN, FloatingCaptions } from './floating-captions'

export function FloatingRoot({ store }: { store: CaptionsStore }) {
  const { settings, update } = useSettings()
  if (!settings) return null
  return (
    <FloatingCaptions
      store={store}
      myName={settings.myName}
      fontSize={settings.floatingFontSize}
      onFontSizeChange={(size) => {
        void update({
          floatingFontSize: Math.min(FONT_MAX, Math.max(FONT_MIN, size)),
        })
      }}
    />
  )
}
