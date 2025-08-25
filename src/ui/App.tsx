import { useState } from 'react'
import { PulseLoader } from 'react-spinners'
function App() {
  const [isLoading, setIsLoading] = useState(false)

  async function getCaptionsTranscript(): Promise<void> {
    setIsLoading(true)
    await chrome.runtime.sendMessage({ type: 'GET_CAPTIONS_TRANSCRIPT' })
    setIsLoading(false)
  }

  async function getFullVideoScreen(): Promise<void> {
    await chrome.runtime.sendMessage({ type: 'FULL_VIDEO_SCREEN' })
  }

  return (
    <div className="flex justify-center items-center gap-5 w-[400px] h-[100px] p-3">
      <h2>Transcribing your Meeting</h2>
      <button
        className={`bg-blue-500 text-white py-2 px-4 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          className={`bg-blue-500 text-white py-2 px-4 rounded`}
          onClick={getFullVideoScreen}
        >
          Get Full Screen Video
        </button>
      </div>
    </div>
  )
}

export default App
