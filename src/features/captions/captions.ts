export function extractCaptions() {
  const captionsContainer = document.querySelector<HTMLElement>(
    '[aria-label="Captions"]'
  )

  const raw = captionsContainer?.innerText || ''

  // Normalize newlines
  const text = raw.replace(/\r\n?/g, '\n').trim()

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

function defaultName() {
  return `formatted-transcript-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
}

export function downloadCaptions(formatted: string) {
  const dataUrl =
    'data:text/plain;charset=utf-8,' + encodeURIComponent(formatted)
  chrome.downloads.download({
    url: dataUrl,
    filename: defaultName(),
    saveAs: true,
  })
}
