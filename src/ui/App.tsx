import { Toaster } from '@/components/chadcn/sonner'

import { PulseLoader } from 'react-spinners'
import { useApp } from './useApp'

function App() {
  const {
    isLoading,
    hideCaption,
    getCaptionsTranscript,
    getFullVideoScreen,
    getFullVideoScreenStyles,
    hideCaptions,
    showCaptions,
  } = useApp()

  return (
    <>
      <div className="flex flex-col justify-center items-center gap-5 p-3">
        <h2 className="text-xl">Transcribing your Meeting</h2>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              className={`w-full bg-blue-500 text-white py-2 px-2 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={getCaptionsTranscript}
              disabled={isLoading}
            >
              {isLoading ? (
                <PulseLoader color="white" size={12} />
              ) : (
                'Get Transcription'
              )}
            </button>
          </div>
          <div className="flex gap-3">
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
          <div className="flex gap-3">
            {hideCaption ? (
              <button
                className={`bg-blue-500 text-white py-2 px-3 rounded`}
                onClick={showCaptions}
              >
                Show Caption
              </button>
            ) : (
              <button
                className={`bg-blue-500 text-white py-2 px-3 rounded`}
                onClick={hideCaptions}
              >
                Hide Caption
              </button>
            )}
          </div>
        </div>
      </div>
      <Toaster position="top-right" duration={2000} />
    </>
  )
}

export default App
