import { useCallback, useEffect, useState } from 'react'
import { getSettings, onSettingsChange, updateSettings } from '@/shared/storage'
import type { Settings } from '@/shared/types'

export function useSettings(): {
  settings: Settings | null
  update: (patch: Partial<Settings>) => Promise<void>
} {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    let active = true
    void getSettings().then((loaded) => {
      if (active) setSettings(loaded)
    })
    const unsubscribe = onSettingsChange((next) => {
      if (active) setSettings(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings(await updateSettings(patch))
  }, [])

  return { settings, update }
}
