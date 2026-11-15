import { useEffect, useState } from 'react'
import {
  STORAGE_KEYS,
  getLiveStatus,
  onStorageKeysChange,
} from '@/shared/storage'
import type { LiveStatus } from '@/shared/types'

const RECHECK_MS = 5_000

/** Status da reunião em andamento. Relê a cada mudança e a cada 5 s. */
export function useLiveStatus(): LiveStatus | undefined {
  const [live, setLive] = useState<LiveStatus | undefined>(undefined)

  useEffect(() => {
    let active = true
    const refresh = () => {
      void getLiveStatus().then((status) => {
        if (active) setLive(status)
      })
    }
    refresh()
    const unsubscribe = onStorageKeysChange([STORAGE_KEYS.live], refresh)
    const timer = setInterval(refresh, RECHECK_MS)
    return () => {
      active = false
      unsubscribe()
      clearInterval(timer)
    }
  }, [])

  return live
}
