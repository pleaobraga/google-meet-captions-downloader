import { Toaster, toast } from '@/components/chadcn/sonner'

import { useState } from 'react'
import { PulseLoader } from 'react-spinners'

function App() {
  const [isLoading, setIsLoading] = useState(false)

  async function getCaptionsTranscript(): Promise<void> {
    setIsLoading(true)

    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_CAPTIONS_TRANSCRIPT',
    })

    if (captionsError) {
      toast.error(`Error extracting captions: ${captionsError}`)
    }

    setIsLoading(false)
  }

  async function getFullVideoScreen(): Promise<void> {
    const { error, success } = await chrome.runtime.sendMessage({
      type: 'APPLY_FULL_VIDEO_SCREEN',
    })

    if (success) {
      toast.success('Successfully applied full video styles!')
    }

    if (error) {
      toast.error(`Error increasing video size: ${error}`)
    }
  }

  async function getFullVideoScreenStyles(): Promise<void> {
    const { error, success } = await chrome.runtime.sendMessage({
      type: 'GET_FULL_VIDEO_SCREEN_STYLES',
    })

    if (error) {
      toast.error(`Error getting video size: ${error}`)
    }

    if (success) {
      toast.success('Successfully got video styles!')
    }
  }

  return (
    <>
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
          <button
            className={`bg-blue-500 text-white py-2 px-3 rounded`}
            onClick={getFullVideoScreenStyles}
          >
            Get Full Screen Video Styles
          </button>
          <button
            className={`bg-blue-500 text-white py-2 px-3 rounded`}
            onClick={getFullVideoScreen}
          >
            Apply Full Screen Video
          </button>
        </div>
      </div>
      <Toaster position="top-right" duration={2000} />
    </>
  )
}

export default App
