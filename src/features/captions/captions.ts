import { formatDateToFilename } from '@/lib/utils'

export function formatCaptions(captions: string) {
  const text = captions.replace(/\r\n?/g, '\n').trim()

  // A "speaker line" is a line that looks like a proper name (no trailing punctuation),
  // e.g., "You", "Pedro". Supports accents.
  const speakerLine = /^[A-ZÀ-ÿ][\wÀ-ÿ'.-]*(?: [A-ZÀ-ÿ][\wÀ-ÿ'.-]*)*$/

  const lines = text.split('\n')
  let currentSpeaker: string | null = null
  let buffer: string[] = []
  const blocks: Array<{ speaker: string; text: string }> = []

  const flush = () => {
    if (currentSpeaker && buffer.length) {
      // Join speech lines, collapse excess whitespace
      const speech = buffer.join(' ').replace(/\s+/g, ' ').trim()
      if (speech) blocks.push({ speaker: currentSpeaker, text: speech })
    }
    buffer = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed && speakerLine.test(trimmed)) {
      // New speaker header line
      flush()
      currentSpeaker = trimmed
      continue
    }

    // Speech line (may be empty or fragmented by \n)
    if (trimmed === '' && buffer.length === 0) continue // skip leading empties
    buffer.push(trimmed)
  }
  flush()

  // Render `speaker: text` separated by blank lines
  return blocks.map((b) => `${b.speaker}: ${b.text}`).join('\n\n')
}

export function extractCaptions() {
  const captionsContainer = document.querySelector<HTMLElement>(
    '[aria-label="Captions"]'
  )

  return captionsContainer?.innerText || ''
}

export function transcriptNameByDate(date?: Date) {
  const formattedDate = formatDateToFilename(date)

  return `formatted-transcript-${formattedDate}.txt`
}

export function downloadCaptions(formatted: string, filename?: string) {
  const dataUrl =
    'data:text/plain;charset=utf-8,' + encodeURIComponent(formatted)

  const downloadFileName = filename ?? transcriptNameByDate()

  chrome.downloads.download({
    url: dataUrl,
    filename: downloadFileName,
    saveAs: true,
  })
}

export function getPastTranscriptions(savedItemsPrefix: string) {
  const pastTranscriptions: {
    [key: string]: {
      text: string
      timestamp: number
      id: string
      title: string
    }
  } = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)

    if (key?.startsWith(savedItemsPrefix)) {
      const value = JSON.parse(localStorage.getItem(key)!)

      if (value) {
        pastTranscriptions[key] = {
          text: value.text,
          timestamp: Number(key.split('_')[1]),
          title: value.title,
          id: key,
        }
      }
    }
  }

  return pastTranscriptions
}

export function deletePastTranscriptions(id: string) {
  localStorage.removeItem(id)
}
