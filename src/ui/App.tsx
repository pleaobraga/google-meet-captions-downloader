import { useState } from 'react'
import { PulseLoader } from 'react-spinners'
function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getCaptionsTranscript(): Promise<void> {
    setError(null)

    setIsLoading(true)
    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_CAPTIONS_TRANSCRIPT',
    })

    if (captionsError) {
      setError(`Error extracting captions: ${captionsError}`)
    }

    setIsLoading(false)
  }

  async function getFullVideoScreen(): Promise<void> {
    setError(null)
    const { error: fullSizeError } = await chrome.runtime.sendMessage({
      type: 'FULL_VIDEO_SCREEN',
    })

    if (fullSizeError) {
      setError(`Error increasing video size: ${fullSizeError}`)
    }
  }

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-3">
      <h2 className="text-xl">Transcribing your Meeting</h2>
      <div className="flex gap-3">
        <button
          className={`bg-blue-500 text-white py-2 px-2 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={getCaptionsTranscript}
          disabled={isLoading}
        >
          {isLoading ? (
            <PulseLoader color="white" size={12} />
          ) : (
            'Get Transcription'
          )}
        </button>
        <div>
          <button
            className={`bg-blue-500 text-white py-2 px-3 rounded`}
            onClick={getFullVideoScreen}
          >
            Get Full Screen Video
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-2 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      )}
    </div>
  )
}

export default App
