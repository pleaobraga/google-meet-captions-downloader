import { useEffect, useState } from 'react'
import {
  STORAGE_KEYS,
  listMeetings,
  onStorageKeysChange,
} from '@/shared/storage'
import type { MeetingSummary } from '@/shared/types'

export function useMeetings(): MeetingSummary[] | null {
  const [meetings, setMeetings] = useState<MeetingSummary[] | null>(null)

  useEffect(() => {
    let active = true
    const refresh = () => {
      void listMeetings().then((list) => {
        if (active) setMeetings(list)
      })
    }
    refresh()
    const unsubscribe = onStorageKeysChange([STORAGE_KEYS.index], refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return meetings
}
