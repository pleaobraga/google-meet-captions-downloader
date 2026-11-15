import { useEffect, useState } from 'react'
import { listDiagnostics } from '@/shared/storage'
import type { DiagnosticSummary } from '@/shared/types'

const REFRESH_MS = 10_000

export function useDiagnostics(): DiagnosticSummary[] {
  const [logs, setLogs] = useState<DiagnosticSummary[]>([])

  useEffect(() => {
    let active = true
    const refresh = () => {
      void listDiagnostics().then((list) => {
        if (active) setLogs(list)
      })
    }
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return logs
}
