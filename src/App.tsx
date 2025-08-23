import { useState } from 'react'

function App() {
  const [isLoading, setIsLoading] = useState(false)

  function extractCaptions() {
    const captionsContainer = document.querySelector<HTMLElement>(
      '[aria-label="Captions"]'
    )

    const raw = captionsContainer?.innerText || ''

    // Normalize newlines
    const text = raw.replace(/\r\n?/g, '\n').trim()

    // A "speaker line" is a line that looks like a proper name (no trailing punctuation),
    // e.g., "You", "Amanda Drehmer". Supports accents.
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

  const handleButtonClick = async () => {
    setIsLoading(true)

    const [tab] = await chrome.tabs.query({ active: true })
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: extractCaptions,
    })

    const formatted = (result as string) || ''
    if (!formatted) return console.warn('No captions found.')

    // Download directly from the popup via chrome.downloads
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    await chrome.downloads.download({
      url,
      filename: defaultName(),
      saveAs: true,
    })
    URL.revokeObjectURL(url)

    setIsLoading(false)
  }

  return (
    <div className="flex justify-center items-center gap-5 w-[400px] h-[100px] p-3">
      <h2>Transcribing your Meeting</h2>
      <button
        className={`bg-blue-500 text-white py-2 px-4 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleButtonClick}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Get Transcription'}
      </button>
      {/* <PulseLoader color="white" size={12} /> */}
    </div>
  )
}

export default App
