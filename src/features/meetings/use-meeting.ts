import { useEffect, useState } from 'react'
import { STORAGE_KEYS, getMeeting, onStorageKeysChange } from '@/shared/storage'
import type { Meeting } from '@/shared/types'

export function useMeeting(id: string | null): Meeting | null {
  const [meeting, setMeeting] = useState<Meeting | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    const refresh = () => {
      void getMeeting(id).then((found) => {
        if (active) setMeeting(found ?? null)
      })
    }
    refresh()
    const unsubscribe = onStorageKeysChange([STORAGE_KEYS.meeting(id)], refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [id])

  return id ? meeting : null
}
