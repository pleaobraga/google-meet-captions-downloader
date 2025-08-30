import { Toaster } from '@/components/chadcn/sonner'

import { PulseLoader } from 'react-spinners'
import { useApp } from './useApp'

function App() {
  const { isLoading, getCaptionsTranscript } = useApp()

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
        </div>
      </div>
      <Toaster position="top-right" duration={2000} />
    </>
  )
}

export default App
