const pad = (n: number) => String(n).padStart(2, '0')

/** "10:02" no fuso local. */
export function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "14/11/2026" no fuso local. */
export function formatDate(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** "2026-11-14" no fuso local. */
export function formatIsoDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "14/11/2026 10:02" no fuso local. */
export function formatDateTime(ms: number): string {
  return `${formatDate(ms)} ${formatTime(ms)}`
}

/** "32 min" ou "1h 05min". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}min`
}

export function displayTitle(item: {
  customTitle?: string
  title: string
  code: string
}): string {
  if (item.customTitle?.trim()) return item.customTitle.trim()
  if (item.title.trim()) return item.title.trim()
  if (item.code) return `Reunião ${item.code}`
  return 'Reunião sem título'
}
